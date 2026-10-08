import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { kakaoAuthorizeUrl, kakaoConfigured } from "@/lib/kakao-oauth";
import { KAKAO_STATE_COOKIE } from "@/lib/current-user";
import { randomOAuthState } from "@/lib/session";
import { CONSENT_COOKIE_OPTS } from "@/lib/oauth-consent";
import { prepareOauthStart } from "@/lib/oauth-start";

export async function GET(request: Request) {
  const started = await prepareOauthStart(request);
  if (started.error) return started.error;

  if (!kakaoConfigured()) {
    return NextResponse.redirect(new URL("/login?error=kakao_not_configured", request.url));
  }
  const state = randomOAuthState();
  const authorize = kakaoAuthorizeUrl(state);
  if (!authorize) {
    return NextResponse.redirect(new URL("/login?error=kakao_not_configured", request.url));
  }
  const jar = await cookies();
  jar.set(KAKAO_STATE_COOKIE, state, CONSENT_COOKIE_OPTS);
  return NextResponse.redirect(authorize);
}
