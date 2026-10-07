import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { googleAuthorizeUrl, googleConfigured } from "@/lib/google-oauth";
import { randomOAuthState } from "@/lib/session";
import {
  CONSENT_COOKIE,
  CONSENT_COOKIE_OPTS,
  GOOGLE_STATE_COOKIE,
  OAUTH_NEXT_COOKIE,
  consentIsValid,
  safeNextPath,
} from "@/lib/oauth-consent";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const jar = await cookies();
  if (!consentIsValid(jar.get(CONSENT_COOKIE)?.value)) {
    return NextResponse.redirect(new URL("/login?error=consent", request.url));
  }
  const next = safeNextPath(url.searchParams.get("next") ?? jar.get(OAUTH_NEXT_COOKIE)?.value);
  jar.set(OAUTH_NEXT_COOKIE, next, CONSENT_COOKIE_OPTS);

  if (!googleConfigured()) {
    return NextResponse.redirect(new URL("/login?error=google_not_configured", request.url));
  }
  const state = randomOAuthState();
  const authorize = googleAuthorizeUrl(request.url, state);
  if (!authorize) {
    return NextResponse.redirect(new URL("/login?error=google_not_configured", request.url));
  }
  jar.set(GOOGLE_STATE_COOKIE, state, CONSENT_COOKIE_OPTS);
  return NextResponse.redirect(authorize);
}
