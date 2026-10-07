import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  CONSENT_COOKIE,
  CONSENT_COOKIE_OPTS,
  OAUTH_INTENT_COOKIE,
  OAUTH_NEXT_COOKIE,
  consentIsValid,
  parseOauthIntent,
  safeNextPath,
} from "@/lib/oauth-consent";

export async function prepareOauthStart(request: Request) {
  const url = new URL(request.url);
  const jar = await cookies();
  const intent = parseOauthIntent(url.searchParams.get("intent"));
  if (intent === "signup" && !consentIsValid(jar.get(CONSENT_COOKIE)?.value)) {
    return {
      error: NextResponse.redirect(new URL("/login?tab=signup&error=consent", request.url)),
      intent,
      next: "/",
    };
  }
  const next = safeNextPath(url.searchParams.get("next") ?? jar.get(OAUTH_NEXT_COOKIE)?.value);
  jar.set(OAUTH_NEXT_COOKIE, next, CONSENT_COOKIE_OPTS);
  jar.set(OAUTH_INTENT_COOKIE, intent, CONSENT_COOKIE_OPTS);
  return { error: null, intent, next };
}
