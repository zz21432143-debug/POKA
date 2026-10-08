import { prisma } from "@/lib/db";
import {
  AUTHOR_IP_RETENTION_DAYS,
  BAN_REJOIN_LOG_KIND,
  BAN_REJOIN_RETENTION_DAYS,
  socialFingerprint,
} from "@/lib/account-privacy";

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

  if (user.status === "BANNED") {
    const rows = [
      user.kakaoId ? socialFingerprint("kakao", user.kakaoId) : null,
      user.googleId ? socialFingerprint("google", user.googleId) : null,
    ].filter((row): row is string => Boolean(row));
    if (rows.length > 0) {
      await prisma.auditLog.createMany({
        data: rows.map((detail) => ({
          kind: BAN_REJOIN_LOG_KIND,
          userId,
          ip: user.signupIp ?? "",
          detail,
        })),
      });
    }
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
