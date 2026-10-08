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
import { findSocialUser, upsertSocialUser, type SocialProfile } from "@/lib/social-account";
import { AccountRestrictedError, assertAccountActive } from "@/lib/account-restriction";
import { clientIp } from "@/lib/request";
import { prisma } from "@/lib/db";

function restrictionRedirect(request: Request, message: string) {
  const url = new URL("/login", request.url);
  url.searchParams.set("error", "restricted");
  url.searchParams.set("msg", message);
  return NextResponse.redirect(url);
}

export async function finishSocialAuth(request: Request, profile: SocialProfile) {
  const jar = await cookies();
  const next = safeNextPath(jar.get(OAUTH_NEXT_COOKIE)?.value);
  const intent = parseOauthIntent(jar.get(OAUTH_INTENT_COOKIE)?.value);
  jar.delete(OAUTH_NEXT_COOKIE);
  jar.delete(OAUTH_INTENT_COOKIE);
  const ip = clientIp(request);

  if (intent === "signup") {
    if (!consentIsValid(jar.get(CONSENT_COOKIE)?.value)) {
      jar.delete(CONSENT_COOKIE);
      return NextResponse.redirect(new URL("/login?tab=signup&error=consent", request.url));
    }
    jar.delete(CONSENT_COOKIE);
    const user = await upsertSocialUser(profile, { signupIp: ip }).catch((error: unknown) => {
      const message = error instanceof Error ? error.message : "가입할 수 없습니다.";
      const url = new URL("/login", request.url);
      url.searchParams.set("tab", "signup");
      url.searchParams.set("error", "restricted");
      url.searchParams.set("msg", message);
      return url;
    });
    if (user instanceof URL) return NextResponse.redirect(user);
    try {
      await assertAccountActive(user);
    } catch (error) {
      if (error instanceof AccountRestrictedError) return restrictionRedirect(request, error.message);
      throw error;
    }
    await setSessionNickname(user.nickname);
    return NextResponse.redirect(new URL(next, request.url));
  }

  jar.delete(CONSENT_COOKIE);
  const existing = await findSocialUser(profile);
  if (!existing || existing.withdrawnAt) {
    return NextResponse.redirect(new URL("/login?tab=signup&error=need_signup", request.url));
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
  return NextResponse.redirect(new URL(next, request.url));
}
