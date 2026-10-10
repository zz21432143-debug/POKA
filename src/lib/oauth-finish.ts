import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  CONSENT_COOKIE,
  OAUTH_INTENT_COOKIE,
  OAUTH_NEXT_COOKIE,
  consentIsValid,
  parseOauthIntent,
  safeNextPath,
} from "@/lib/oauth-consent";
import { setSessionNickname } from "@/lib/current-user";
import { socialRejoinBlockMessage } from "@/lib/account-delete";
import { findSocialUser, upsertSocialUser, type SocialProfile } from "@/lib/social-account";
import { AccountRestrictedError, assertAccountActive } from "@/lib/account-restriction";
import { clientIp } from "@/lib/request";
import { prisma } from "@/lib/db";

function sendTo(url: URL) {
  return NextResponse.redirect(url, 303);
}

function restrictionRedirect(request: Request, message: string) {
  const url = new URL("/login", request.url);
  url.searchParams.set("error", "restricted");
  url.searchParams.set("msg", message);
  return sendTo(url);
}

function isMasterKakao(profile: SocialProfile) {
  if (profile.provider !== "kakao") return false;
  const id = process.env.MASTER_KAKAO_ID?.trim();
  if (id && profile.providerId.trim() === id) return true;
  const email = process.env.MASTER_KAKAO_EMAIL?.trim().toLowerCase();
  return Boolean(email && profile.email?.trim().toLowerCase() === email);
}

async function linkMasterKakao(profile: SocialProfile) {
  if (!isMasterKakao(profile)) return null;
  const master = await prisma.user.findFirst({ where: { isMaster: true }, orderBy: { createdAt: "asc" } });
  if (!master) return null;
  const kakaoId = profile.providerId.trim();
  if (master.kakaoId !== kakaoId) {
    await prisma.user.updateMany({
      where: { kakaoId, NOT: { id: master.id } },
      data: { kakaoId: null },
    });
  }
  return prisma.user.update({
    where: { id: master.id },
    data: { kakaoId, lastLoginAt: new Date(), passwordHash: null },
  });
}

export async function finishSocialAuth(request: Request, profile: SocialProfile) {
  const jar = await cookies();
  const next = safeNextPath(jar.get(OAUTH_NEXT_COOKIE)?.value);
  const intent = parseOauthIntent(jar.get(OAUTH_INTENT_COOKIE)?.value);
  jar.delete(OAUTH_NEXT_COOKIE);
  jar.delete(OAUTH_INTENT_COOKIE);
  const ip = clientIp(request);

  const master = await linkMasterKakao(profile);
  if (master) {
    jar.delete(CONSENT_COOKIE);
    await setSessionNickname(master.nickname);
    return sendTo(new URL(next, request.url));
  }

  if (intent === "signup") {
    if (!consentIsValid(jar.get(CONSENT_COOKIE)?.value)) {
      jar.delete(CONSENT_COOKIE);
      return sendTo(new URL("/login?tab=signup&error=consent", request.url));
    }
    jar.delete(CONSENT_COOKIE);
    const created = await upsertSocialUser(profile, { signupIp: ip }).catch((error: unknown) => {
      const message = error instanceof Error ? error.message : "가입할 수 없습니다.";
      const url = new URL("/login", request.url);
      url.searchParams.set("tab", "signup");
      url.searchParams.set("error", "restricted");
      url.searchParams.set("msg", message);
      return url;
    });
    if (created instanceof URL) return sendTo(created);
    const { user, isNew } = created;
    try {
      await assertAccountActive(user);
    } catch (error) {
      if (error instanceof AccountRestrictedError) return restrictionRedirect(request, error.message);
      throw error;
    }
    await setSessionNickname(user.nickname);
    if (isNew) {
      const welcome = new URL("/welcome", request.url);
      if (next !== "/") welcome.searchParams.set("next", next);
      return sendTo(welcome);
    }
    return sendTo(new URL(next, request.url));
  }

  jar.delete(CONSENT_COOKIE);
  const cooldown = await socialRejoinBlockMessage(profile.provider, profile.providerId, profile.email);
  if (cooldown) return restrictionRedirect(request, cooldown);
  const existing = await findSocialUser(profile);
  if (!existing || existing.withdrawnAt) {
    return sendTo(new URL("/login?tab=signup&error=need_signup", request.url));
  }
  try {
    await assertAccountActive(existing);
  } catch (error) {
    if (error instanceof AccountRestrictedError) return restrictionRedirect(request, error.message);
    throw error;
  }
  await prisma.user.update({
    where: { id: existing.id },
    data: { lastLoginAt: new Date() },
  });
  await setSessionNickname(existing.nickname);
  return sendTo(new URL(next, request.url));
}
