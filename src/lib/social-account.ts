import { prisma } from "@/lib/db";
import { nicknameError, normalizeNickname } from "@/lib/nickname";

export type SocialProvider = "kakao" | "google";

export type SocialProfile = {
  provider: SocialProvider;
  providerId: string;
  email: string | null;
  nickname: string;
};

function cleanEmail(raw: string | null | undefined) {
  const email = raw?.trim().toLowerCase() ?? "";
  if (!email || !email.includes("@")) return null;
  return email;
}

export async function uniqueSocialNickname(base: string, fallback: string) {
  let cleaned = normalizeNickname(base).slice(0, 12);
  if (nicknameError(cleaned)) cleaned = fallback;
  let candidate = cleaned;
  let n = 1;
  while (await prisma.user.findUnique({ where: { nickname: candidate } })) {
    n += 1;
    const suffix = String(n);
    candidate = `${cleaned.slice(0, Math.max(2, 12 - suffix.length))}${suffix}`;
  }
  return candidate;
}

export async function findSocialUser(profile: Pick<SocialProfile, "provider" | "providerId" | "email">) {
  const email = cleanEmail(profile.email);
  const providerId = profile.providerId.trim();
  if (!providerId) return null;
  const byId =
    profile.provider === "kakao"
      ? await prisma.user.findUnique({ where: { kakaoId: providerId } })
      : await prisma.user.findUnique({ where: { googleId: providerId } });
  if (byId) return byId;
  if (!email) return null;
  return prisma.user.findUnique({ where: { email } });
}

export async function upsertSocialUser(profile: SocialProfile) {
  const now = new Date();
  const email = cleanEmail(profile.email);
  const providerId = profile.providerId.trim();
  if (!providerId) throw new Error("소셜 계정 식별자를 받지 못했습니다.");

  let user = await findSocialUser(profile);

  const consents = {
    adultConfirmedAt: now,
    termsAcceptedAt: now,
    privacyAcceptedAt: now,
    ...(email ? { email, emailVerifiedAt: now } : {}),
    ...(profile.provider === "kakao" ? { kakaoId: providerId } : { googleId: providerId }),
  };

  if (user) {
    return prisma.user.update({
      where: { id: user.id },
      data: consents,
    });
  }

  const nickname = await uniqueSocialNickname(
    profile.nickname,
    profile.provider === "kakao" ? "카카오회원" : "구글회원",
  );

  user = await prisma.user.create({
    data: {
      nickname,
      kakaoId: profile.provider === "kakao" ? providerId : null,
      googleId: profile.provider === "google" ? providerId : null,
      email,
      emailVerifiedAt: email ? now : null,
      adultConfirmedAt: now,
      termsAcceptedAt: now,
      privacyAcceptedAt: now,
      level: 1,
      exp: 0,
      points: 0,
    },
  });

  const { pushTicker } = await import("@/lib/ticker");
  const via = profile.provider === "kakao" ? "카카오" : "구글";
  await pushTicker({
    kind: `JOIN:${user.id}`,
    message: `👋 ${user.nickname}님이 ${via}로 POKA에 들어왔습니다!`,
    href: `/u/${encodeURIComponent(user.nickname)}`,
  });
  return user;
}
