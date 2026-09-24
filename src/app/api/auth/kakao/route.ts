import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { setSessionNickname } from "@/lib/current-user";
import { kakaoAuthorizeUrl, kakaoRestApiKey } from "@/lib/kakao-oauth";
import { pushTicker } from "@/lib/ticker";

export async function GET(request: Request) {
  const authorize = kakaoAuthorizeUrl(request.url);
  if (authorize) {
    return NextResponse.redirect(authorize);
  }

  const existing = await prisma.user.findUnique({ where: { kakaoId: "local-demo" } });
  const user =
    existing ??
    (await prisma.user.create({
      data: {
        nickname: "카카오손님",
        kakaoId: "local-demo",
        level: 1,
        exp: 0,
        points: 0,
      },
    }));
  await setSessionNickname(user.nickname);
  if (!existing) {
    await pushTicker({
      kind: `JOIN:${user.id}`,
      message: `👋 ${user.nickname}님이 POKA에 들어왔습니다!`,
      href: `/u/${encodeURIComponent(user.nickname)}`,
    });
  }
  return NextResponse.redirect(new URL("/", request.url));
}

export function kakaoConfigured() {
  return Boolean(kakaoRestApiKey());
}
