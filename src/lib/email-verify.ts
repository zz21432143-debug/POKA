import { randomBytes, randomInt } from "node:crypto";
import { prisma } from "@/lib/db";
import { emailError, normalizeEmail } from "@/lib/email-address";
import { canRevealVerifyArtifacts, sendMail, verificationMail } from "@/lib/mailer";
import { packVerifySecret, matchVerifySecret } from "@/lib/verify-secret";
import { pushTicker } from "@/lib/ticker";

const VERIFY_TTL_MS = 24 * 60 * 60 * 1000;

export { packVerifySecret, matchVerifySecret };

export function newVerifyToken() {
  return randomBytes(24).toString("base64url");
}

export function newVerifyCode() {
  return String(randomInt(100000, 1000000));
}

export async function issueVerification(userId: string, email: string) {
  const token = newVerifyToken();
  const code = newVerifyCode();
  await prisma.user.update({
    where: { id: userId },
    data: {
      emailVerifyHash: packVerifySecret(token, code),
      emailVerifyExpires: new Date(Date.now() + VERIFY_TTL_MS),
    },
  });
  const mail = verificationMail(email, token);
  const mailText = `${mail.text}\n\n메일이 오지 않으면 가입 화면에 표시된 인증 코드 ${code} 를 입력하세요.`;
  const result = await sendMail({ to: email, subject: mail.subject, text: mailText });
  const reveal = canRevealVerifyArtifacts(result.sent);
  return {
    token,
    code,
    url: mail.url,
    sent: result.sent,
    verifyUrl: reveal ? mail.url : undefined,
    verifyCode: reveal ? code : undefined,
  };
}

export async function completeEmailVerification(emailRaw: string, secretRaw: string) {
  const email = normalizeEmail(emailRaw);
  const secret = secretRaw.trim();
  if (emailError(email) || !secret) {
    return { ok: false as const, error: "인증 링크가 올바르지 않습니다." };
  }
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return { ok: false as const, error: "인증 링크가 올바르지 않습니다." };
  }
  if (user.emailVerifiedAt) {
    return { ok: true as const, nickname: user.nickname, already: true };
  }
  if (!user.emailVerifyHash || !user.emailVerifyExpires || user.emailVerifyExpires < new Date()) {
    return { ok: false as const, error: "인증 링크가 만료되었습니다. 다시 요청하세요." };
  }
  if (!matchVerifySecret(secret, user.emailVerifyHash)) {
    return { ok: false as const, error: "인증 링크가 올바르지 않습니다." };
  }
  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerifiedAt: new Date(),
      emailVerifyHash: null,
      emailVerifyExpires: null,
    },
  });
  await pushTicker({
    kind: `JOIN:${user.id}`,
    message: `👋 ${user.nickname}님이 POKA에 가입했습니다!`,
    href: `/u/${encodeURIComponent(user.nickname)}`,
  });
  return { ok: true as const, nickname: user.nickname, already: false };
}
