import { prisma } from "@/lib/db";
import {
  AUTHOR_IP_RETENTION_DAYS,
  BAN_REJOIN_LOG_KIND,
  BAN_REJOIN_RETENTION_DAYS,
  WITHDRAW_REJOIN_LOG_KIND,
  socialFingerprint,
} from "@/lib/account-privacy";
import { WITHDRAW_REJOIN_DAYS } from "@/lib/withdraw-copy";

export class WithdrawError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WithdrawError";
  }
}

export async function withdrawAccount(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new WithdrawError("회원 정보를 찾을 수 없습니다.");
  if (user.withdrawnAt) throw new WithdrawError("이미 탈퇴한 계정입니다.");
  if (user.isMaster) {
    throw new WithdrawError("마스터 계정은 화면에서 탈퇴할 수 없습니다. 문의 메일로 요청해 주세요.");
  }

  const fingerprints = [
    user.kakaoId ? socialFingerprint("kakao", user.kakaoId) : null,
    user.googleId ? socialFingerprint("google", user.googleId) : null,
    user.email ? socialFingerprint("email", user.email.trim().toLowerCase()) : null,
  ].filter((row): row is string => Boolean(row));
  if (fingerprints.length > 0) {
    await prisma.auditLog.createMany({
      data: fingerprints.map((detail) => ({
        kind: user.status === "BANNED" ? BAN_REJOIN_LOG_KIND : WITHDRAW_REJOIN_LOG_KIND,
        userId,
        ip: user.signupIp ?? "",
        detail,
      })),
    });
  }

  await prisma.post.updateMany({
    where: { authorId: userId },
    data: { jobContact: null },
  });

  const nick = `탈퇴_${user.id.replace(/[^a-zA-Z0-9]/g, "").slice(-12) || user.id.slice(-8)}`;
  await prisma.user.update({
    where: { id: userId },
    data: {
      withdrawnAt: new Date(),
      nickname: nick,
      email: null,
      kakaoId: null,
      googleId: null,
      passwordHash: null,
      profileMarkImageUrl: null,
      equippedMarkId: null,
      equippedFrameId: null,
      equippedEffectId: null,
      emailVerifyHash: null,
      emailVerifyExpires: null,
      resetCodeHash: null,
      resetCodeExpires: null,
      isDealerVerified: false,
      isAdmin: false,
      isMaster: false,
      role: "USER",
      points: 0,
      emailVerifiedAt: null,
    },
  });

  return nick;
}

export async function bannedSocialBlocked(provider: string, providerId: string) {
  const since = new Date(Date.now() - BAN_REJOIN_RETENTION_DAYS * 24 * 60 * 60 * 1000);
  const detail = socialFingerprint(provider, providerId);
  const row = await prisma.auditLog.findFirst({
    where: { kind: BAN_REJOIN_LOG_KIND, detail, createdAt: { gte: since } },
    select: { id: true },
  });
  return Boolean(row);
}

function remainingRejoinDays(createdAt: Date) {
  const elapsed = Date.now() - createdAt.getTime();
  const left = WITHDRAW_REJOIN_DAYS * 24 * 60 * 60 * 1000 - elapsed;
  return Math.max(1, Math.ceil(left / (24 * 60 * 60 * 1000)));
}

export async function socialRejoinBlockMessage(
  provider: string,
  providerId: string,
  email?: string | null,
) {
  if (await bannedSocialBlocked(provider, providerId)) {
    return "영구 정지된 계정은 재가입할 수 없습니다.";
  }
  const since = new Date(Date.now() - WITHDRAW_REJOIN_DAYS * 24 * 60 * 60 * 1000);
  const details = [
    socialFingerprint(provider, providerId),
    email?.trim() ? socialFingerprint("email", email.trim().toLowerCase()) : null,
  ].filter((row): row is string => Boolean(row));
  const row = await prisma.auditLog.findFirst({
    where: { kind: WITHDRAW_REJOIN_LOG_KIND, detail: { in: details }, createdAt: { gte: since } },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  if (!row) return null;
  const days = remainingRejoinDays(row.createdAt);
  return `탈퇴 후 ${WITHDRAW_REJOIN_DAYS}일 동안은 같은 계정으로 다시 가입할 수 없습니다. ${days}일 뒤에 시도해 주세요.`;
}

export async function purgeExpiredAuthorIps() {
  const cutoff = new Date(Date.now() - AUTHOR_IP_RETENTION_DAYS * 24 * 60 * 60 * 1000);
  await prisma.post.updateMany({
    where: { authorIp: { not: null }, createdAt: { lt: cutoff } },
    data: { authorIp: null },
  });
  await prisma.comment.updateMany({
    where: { authorIp: { not: null }, createdAt: { lt: cutoff } },
    data: { authorIp: null },
  });
}
