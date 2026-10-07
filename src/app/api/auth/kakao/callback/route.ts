import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { KAKAO_STATE_COOKIE, setSessionNickname } from "@/lib/current-user";
import { kakaoRedirectUri, kakaoRestApiKey } from "@/lib/kakao-oauth";
import { normalizeNickname } from "@/lib/nickname";
import { pushTicker } from "@/lib/ticker";

async function uniqueKakaoNickname(base: string) {
  const cleaned = normalizeNickname(base).slice(0, 10) || "카카오";
  let candidate = cleaned;
  let n = 1;
  while (await prisma.user.findUnique({ where: { nickname: candidate } })) {
    n += 1;
    candidate = `${cleaned}${n}`.slice(0, 12);
  }
  return candidate;
}

export async function GET(request: Request) {
  const key = kakaoRestApiKey();
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state") ?? "";
  const jar = await cookies();
  const expected = jar.get(KAKAO_STATE_COOKIE)?.value ?? "";
  jar.delete(KAKAO_STATE_COOKIE);

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
    id?: number;
    kakao_account?: { profile?: { nickname?: string } };
    properties?: { nickname?: string };
  };
  if (!me.id) {
    return NextResponse.redirect(new URL("/login?error=kakao", request.url));
  }

  const kakaoId = String(me.id);
  const nickFromKakao = me.kakao_account?.profile?.nickname ?? me.properties?.nickname ?? "카카오";
  let user = await prisma.user.findUnique({ where: { kakaoId } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        kakaoId,
        nickname: await uniqueKakaoNickname(nickFromKakao),
        level: 1,
        exp: 0,
        points: 0,
      },
    });
    await pushTicker({
      kind: `JOIN:${user.id}`,
      message: `👋 ${user.nickname}님이 카카오로 POKA에 들어왔습니다!`,
      href: `/u/${encodeURIComponent(user.nickname)}`,
    });
  }
  await setSessionNickname(user.nickname);
  return NextResponse.redirect(new URL("/", request.url));
}
