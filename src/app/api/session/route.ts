import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { SESSION_COOKIE } from "@/lib/current-user";

export async function POST(request: Request) {
  const body = (await request.json()) as { nickname?: string };
  const nickname = body.nickname?.trim();
  if (!nickname) {
    return NextResponse.json({ error: "닉네임을 선택하세요." }, { status: 400 });
  }
  const user = await prisma.user.findUnique({ where: { nickname } });
  if (!user) {
    return NextResponse.json({ error: "회원을 찾을 수 없습니다." }, { status: 404 });
  }
  const jar = await cookies();
  jar.set(SESSION_COOKIE, user.nickname, {
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
  });
  return NextResponse.json({ ok: true, nickname: user.nickname });
}
