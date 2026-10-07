import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  CONSENT_COOKIE,
  GOOGLE_STATE_COOKIE,
  OAUTH_NEXT_COOKIE,
  consentIsValid,
  safeNextPath,
} from "@/lib/oauth-consent";
import { setSessionNickname } from "@/lib/current-user";
import { googleClientId, googleClientSecret, googleRedirectUri } from "@/lib/google-oauth";
import { upsertSocialUser } from "@/lib/social-account";

export async function GET(request: Request) {
  const clientId = googleClientId();
  const clientSecret = googleClientSecret();
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state") ?? "";
  const jar = await cookies();
  const expected = jar.get(GOOGLE_STATE_COOKIE)?.value ?? "";
  const next = safeNextPath(jar.get(OAUTH_NEXT_COOKIE)?.value);
  jar.delete(GOOGLE_STATE_COOKIE);
  jar.delete(OAUTH_NEXT_COOKIE);

  if (!consentIsValid(jar.get(CONSENT_COOKIE)?.value)) {
    jar.delete(CONSENT_COOKIE);
    return NextResponse.redirect(new URL("/login?error=consent", request.url));
  }
  jar.delete(CONSENT_COOKIE);

  if (!clientId || !clientSecret || !code || !state || !expected || state !== expected) {
    return NextResponse.redirect(new URL("/login?error=google", request.url));
  }

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: googleRedirectUri(request.url),
      grant_type: "authorization_code",
    }),
  });
  const token = (await tokenRes.json()) as { access_token?: string };
  if (!token.access_token) {
    return NextResponse.redirect(new URL("/login?error=google", request.url));
  }

  const meRes = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { Authorization: `Bearer ${token.access_token}` },
  });
  const me = (await meRes.json()) as {
    sub?: string;
    email?: string;
    name?: string;
  };
  if (!me.sub) {
    return NextResponse.redirect(new URL("/login?error=google", request.url));
  }

  const user = await upsertSocialUser({
    provider: "google",
    providerId: me.sub,
    email: me.email ?? null,
    nickname: me.name ?? "구글회원",
  });
  await setSessionNickname(user.nickname);
  return NextResponse.redirect(new URL(next, request.url));
}
