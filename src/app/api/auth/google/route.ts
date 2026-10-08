import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { googleAuthorizeUrl, googleConfigured } from "@/lib/google-oauth";
import { randomOAuthState } from "@/lib/session";
import { CONSENT_COOKIE_OPTS, GOOGLE_STATE_COOKIE } from "@/lib/oauth-consent";
import { prepareOauthStart } from "@/lib/oauth-start";

export async function GET(request: Request) {
  const started = await prepareOauthStart(request);
  if (started.error) return started.error;

  if (!googleConfigured()) {
    return NextResponse.redirect(new URL("/login?error=google_not_configured", request.url), 303);
  }
  const state = randomOAuthState();
  const authorize = googleAuthorizeUrl(request.url, state);
  if (!authorize) {
    return NextResponse.redirect(new URL("/login?error=google_not_configured", request.url), 303);
  }
  const jar = await cookies();
  jar.set(GOOGLE_STATE_COOKIE, state, CONSENT_COOKIE_OPTS);
  return NextResponse.redirect(authorize);
}
