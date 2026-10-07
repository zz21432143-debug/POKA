import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { CONSENT_COOKIE, OAUTH_NEXT_COOKIE, consentIsValid, safeNextPath } from "@/lib/oauth-consent";
import { KAKAO_STATE_COOKIE, setSessionNickname } from "@/lib/current-user";
import { kakaoRedirectUri, kakaoRestApiKey } from "@/lib/kakao-oauth";
import { upsertSocialUser } from "@/lib/social-account";

export async function GET(request: Request) {
  const key = kakaoRestApiKey();
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state") ?? "";
  const jar = await cookies();
  const expected = jar.get(KAKAO_STATE_COOKIE)?.value ?? "";
  const next = safeNextPath(jar.get(OAUTH_NEXT_COOKIE)?.value);
  jar.delete(KAKAO_STATE_COOKIE);
  jar.delete(OAUTH_NEXT_COOKIE);

  if (!consentIsValid(jar.get(CONSENT_COOKIE)?.value)) {
    jar.delete(CONSENT_COOKIE);
    return NextResponse.redirect(new URL("/login?error=consent", request.url));
  }
  jar.delete(CONSENT_COOKIE);

  if (!key || !code || !state || !expected || state !== expected) {
    return NextResponse.redirect(new URL("/login?error=kakao", request.url));
  }

  const tokenRes = await fetch("https://kauth.kakao.com/oauth/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded;charset=utf-8" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: key,
      redirect_uri: kakaoRedirectUri(request.url),
      code,
      ...(process.env.KAKAO_CLIENT_SECRET?.trim()
        ? { client_secret: process.env.KAKAO_CLIENT_SECRET.trim() }
        : {}),
    }),
  });
  const token = (await tokenRes.json()) as { access_token?: string };
  if (!token.access_token) {
    return NextResponse.redirect(new URL("/login?error=kakao", request.url));
  }

  const meRes = await fetch("https://kapi.kakao.com/v2/user/me", {
    headers: { Authorization: `Bearer ${token.access_token}` },
  });
  const me = (await meRes.json()) as {
    id?: number | string;
    kakao_account?: { email?: string; profile?: { nickname?: string } };
    properties?: { nickname?: string };
  };
  if (me.id == null) {
    return NextResponse.redirect(new URL("/login?error=kakao", request.url));
  }

  const user = await upsertSocialUser({
    provider: "kakao",
    providerId: String(me.id),
    email: me.kakao_account?.email ?? null,
    nickname: me.kakao_account?.profile?.nickname ?? me.properties?.nickname ?? "카카오회원",
  });
  await setSessionNickname(user.nickname);
  return NextResponse.redirect(new URL(next, request.url));
}
