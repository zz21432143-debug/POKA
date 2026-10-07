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

export async function finishSocialAuth(request: Request, profile: SocialProfile) {
  const jar = await cookies();
  const next = safeNextPath(jar.get(OAUTH_NEXT_COOKIE)?.value);
  const intent = parseOauthIntent(jar.get(OAUTH_INTENT_COOKIE)?.value);
  jar.delete(OAUTH_NEXT_COOKIE);
  jar.delete(OAUTH_INTENT_COOKIE);

  if (intent === "signup") {
    if (!consentIsValid(jar.get(CONSENT_COOKIE)?.value)) {
      jar.delete(CONSENT_COOKIE);
      return NextResponse.redirect(new URL("/login?tab=signup&error=consent", request.url));
    }
    jar.delete(CONSENT_COOKIE);
    const user = await upsertSocialUser(profile);
    await setSessionNickname(user.nickname);
    return NextResponse.redirect(new URL(next, request.url));
  }

  jar.delete(CONSENT_COOKIE);
  const existing = await findSocialUser(profile);
  if (!existing) {
    return NextResponse.redirect(new URL("/login?tab=signup&error=need_signup", request.url));
  }
  await setSessionNickname(existing.nickname);
  return NextResponse.redirect(new URL(next, request.url));
}
