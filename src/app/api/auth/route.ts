import { NextResponse } from "next/server";
import { randomBytes, randomInt } from "node:crypto";
import { prisma } from "@/lib/db";
import { verifyCaptcha } from "@/lib/captcha";
import { clearSession, setSessionNickname } from "@/lib/current-user";
import { emailError, normalizeEmail } from "@/lib/email-address";
import { canRevealVerifyUrl, sendMail, verificationMail } from "@/lib/mailer";
import { nicknameError, normalizeNickname, passwordError } from "@/lib/nickname";
import { hashPassword, verifyPassword } from "@/lib/password";
import { clientIp } from "@/lib/request";
import { CoolDownError, assertWriteCooldown } from "@/lib/security";
import { pushTicker } from "@/lib/ticker";

const VERIFY_TTL_MS = 24 * 60 * 60 * 1000;

function newVerifyToken() {
  return randomBytes(24).toString("base64url");
}

async function issueVerification(userId: string, email: string) {
  const token = newVerifyToken();
  await prisma.user.update({
    where: { id: userId },
    data: {
      emailVerifyHash: hashPassword(token),
      emailVerifyExpires: new Date(Date.now() + VERIFY_TTL_MS),
    },
  });
  const mail = verificationMail(email, token);
  const result = await sendMail({ to: email, subject: mail.subject, text: mail.text });
  return { token, url: mail.url, sent: result.sent };
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      action?: string;
      nickname?: string;
      password?: string;
      newPassword?: string;
      code?: string;
      company?: string;
      website?: string;
      email?: string;
      captchaToken?: string;
      captchaAnswer?: string | number;
      termsAccepted?: boolean | string;
      token?: string;
    };
    const action = body.action;
    if (action === "logout") {
      await clearSession();
      return NextResponse.json({ ok: true });
    }

    const nickname = normalizeNickname(body.nickname ?? "");
    const password = typeof body.password === "string" ? body.password : "";

    if (action === "register") {
      if (body.company?.trim() || body.website?.trim()) {
        return NextResponse.json({ error: "가입할 수 없습니다." }, { status: 400 });
      }
      if (body.termsAccepted !== true && body.termsAccepted !== "true") {
        return NextResponse.json(
          { error: "민·형사상 책임 안내에 동의해야 가입할 수 있습니다." },
          { status: 400 },
        );
      }
      const nickErr = nicknameError(nickname);
      const passErr = passwordError(password);
      const mailErr = emailError(body.email ?? "");
      if (nickErr) return NextResponse.json({ error: nickErr }, { status: 400 });
      if (passErr) return NextResponse.json({ error: passErr }, { status: 400 });
      if (mailErr) return NextResponse.json({ error: mailErr }, { status: 400 });
      const captchaErr = verifyCaptcha(body.captchaToken, body.captchaAnswer);
      if (captchaErr) return NextResponse.json({ error: captchaErr }, { status: 400 });
      const email = normalizeEmail(body.email ?? "");
      await assertWriteCooldown({ kind: "register", ip: clientIp(request) });
      const [takenNick, takenEmail] = await Promise.all([
        prisma.user.findUnique({ where: { nickname } }),
        prisma.user.findUnique({ where: { email } }),
      ]);
      if (takenNick) return NextResponse.json({ error: "이미 있는 닉네임입니다." }, { status: 409 });
      if (takenEmail) return NextResponse.json({ error: "이미 등록된 이메일입니다." }, { status: 409 });
      const user = await prisma.user.create({
        data: {
          nickname,
          email,
          passwordHash: hashPassword(password),
          termsAcceptedAt: new Date(),
          level: 1,
          exp: 0,
          points: 0,
        },
      });
      const issued = await issueVerification(user.id, email);
      return NextResponse.json({
        ok: true,
        needsVerify: true,
        email,
        hint: issued.sent
          ? `${email}로 인증 메일을 보냈습니다. 메일함의 링크를 연 뒤 로그인하세요.`
          : `${email}로 인증 메일을 준비했습니다. 메일 발송 설정이 없으면 아래 링크로 인증하세요.`,
        verifyUrl: canRevealVerifyUrl() || !issued.sent ? issued.url : undefined,
      });
    }

    if (action === "verify-email") {
      const email = normalizeEmail(body.email ?? "");
      const token = typeof body.token === "string" ? body.token.trim() : "";
      if (emailError(email) || !token) {
        return NextResponse.json({ error: "인증 링크가 올바르지 않습니다." }, { status: 400 });
      }
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user?.emailVerifyHash || !user.emailVerifyExpires || user.emailVerifyExpires < new Date()) {
        return NextResponse.json({ error: "인증 링크가 만료되었습니다. 다시 요청하세요." }, { status: 400 });
      }
      if (!verifyPassword(token, user.emailVerifyHash)) {
        return NextResponse.json({ error: "인증 링크가 올바르지 않습니다." }, { status: 400 });
      }
      await prisma.user.update({
        where: { id: user.id },
        data: {
          emailVerifiedAt: new Date(),
          emailVerifyHash: null,
          emailVerifyExpires: null,
        },
      });
      await setSessionNickname(user.nickname);
      await pushTicker({
        kind: `JOIN:${user.id}`,
        message: `👋 ${user.nickname}님이 POKA에 가입했습니다!`,
        href: `/u/${encodeURIComponent(user.nickname)}`,
      });
      return NextResponse.json({ ok: true, nickname: user.nickname });
    }

    if (action === "resend-verify") {
      const email = normalizeEmail(body.email ?? "");
      if (emailError(email)) return NextResponse.json({ error: "이메일을 확인하세요." }, { status: 400 });
      await assertWriteCooldown({ kind: "register", ip: clientIp(request) });
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) return NextResponse.json({ error: "등록된 이메일이 아닙니다." }, { status: 404 });
      if (user.emailVerifiedAt) {
        return NextResponse.json({ error: "이미 인증된 계정입니다. 로그인하세요." }, { status: 400 });
      }
      const issued = await issueVerification(user.id, email);
      return NextResponse.json({
        ok: true,
        hint: issued.sent ? "인증 메일을 다시 보냈습니다." : "인증 링크를 다시 만들었습니다.",
        verifyUrl: canRevealVerifyUrl() || !issued.sent ? issued.url : undefined,
      });
    }

    if (action === "login") {
      if (!nickname || !password) {
        return NextResponse.json({ error: "닉네임과 비밀번호를 입력하세요." }, { status: 400 });
      }
      const user = await prisma.user.findUnique({ where: { nickname } });
      if (!user || !user.passwordHash || !verifyPassword(password, user.passwordHash)) {
        return NextResponse.json({ error: "닉네임 또는 비밀번호가 맞지 않습니다." }, { status: 401 });
      }
      if (user.email && !user.emailVerifiedAt) {
        return NextResponse.json(
          {
            error: "이메일 인증 후 로그인할 수 있습니다. 메일함의 링크를 확인하세요.",
            needsVerify: true,
            email: user.email,
          },
          { status: 403 },
        );
      }
      await setSessionNickname(user.nickname);
      return NextResponse.json({ ok: true, nickname: user.nickname });
    }

    if (action === "forgot") {
      if (!nickname) return NextResponse.json({ error: "닉네임을 입력하세요." }, { status: 400 });
      const user = await prisma.user.findUnique({ where: { nickname } });
      if (!user) return NextResponse.json({ error: "회원을 찾을 수 없습니다." }, { status: 404 });
      if (!user.passwordHash && user.kakaoId) {
        return NextResponse.json({ error: "카카오로 가입한 계정은 카카오 버튼을 이용하세요." }, { status: 400 });
      }
      const code = String(randomInt(100000, 1000000));
      await prisma.user.update({
        where: { id: user.id },
        data: {
          resetCodeHash: hashPassword(code),
          resetCodeExpires: new Date(Date.now() + 15 * 60 * 1000),
        },
      });
      return NextResponse.json({
        ok: true,
        code,
        hint: "메일 연동이 없어 재설정 코드를 이 화면에만 보여 줍니다. 15분 안에 새 비밀번호를 정하세요.",
      });
    }

    if (action === "reset") {
      const next = typeof body.newPassword === "string" ? body.newPassword : "";
      const code = typeof body.code === "string" ? body.code.trim() : "";
      const passErr = passwordError(next);
      if (!nickname || !code) return NextResponse.json({ error: "닉네임과 코드를 입력하세요." }, { status: 400 });
      if (passErr) return NextResponse.json({ error: passErr }, { status: 400 });
      const user = await prisma.user.findUnique({ where: { nickname } });
      if (!user?.resetCodeHash || !user.resetCodeExpires || user.resetCodeExpires < new Date()) {
        return NextResponse.json({ error: "재설정 코드가 만료되었습니다." }, { status: 400 });
      }
      if (!verifyPassword(code, user.resetCodeHash)) {
        return NextResponse.json({ error: "코드가 맞지 않습니다." }, { status: 400 });
      }
      await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: hashPassword(next), resetCodeHash: null, resetCodeExpires: null },
      });
      await setSessionNickname(user.nickname);
      return NextResponse.json({ ok: true, nickname: user.nickname });
    }

    return NextResponse.json({ error: "요청을 확인하세요." }, { status: 400 });
  } catch (error) {
    if (error instanceof CoolDownError) {
      return NextResponse.json(
        { error: error.message },
        { status: 429, headers: { "Retry-After": String(error.retryAfterSec) } },
      );
    }
    const message = error instanceof Error ? error.message : "처리할 수 없습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
