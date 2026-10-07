import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { kakaoAuthorizeUrl, kakaoConfigured } from "@/lib/kakao-oauth";
import { KAKAO_STATE_COOKIE } from "@/lib/current-user";
import { randomOAuthState } from "@/lib/session";

export async function GET(request: Request) {
  if (!kakaoConfigured()) {
    return NextResponse.redirect(new URL("/login?error=kakao_not_configured", request.url));
  }
  const state = randomOAuthState();
  const authorize = kakaoAuthorizeUrl(request.url, state);
  if (!authorize) {
    return NextResponse.redirect(new URL("/login?error=kakao_not_configured", request.url));
  }
  const jar = await cookies();
  jar.set(KAKAO_STATE_COOKIE, state, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 10,
  });
  return NextResponse.redirect(authorize);
}
