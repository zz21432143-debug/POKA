import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser, setSessionNickname } from "@/lib/current-user";

export async function POST(request: Request) {
  const admin = await getCurrentUser();
  if (!admin?.isAdmin) {
    return NextResponse.json({ error: "관리자만 계정을 전환할 수 있습니다." }, { status: 403 });
  }
  const body = (await request.json()) as { nickname?: string };
  const nickname = body.nickname?.trim();
  if (!nickname) {
    return NextResponse.json({ error: "닉네임을 선택하세요." }, { status: 400 });
  }
  const user = await prisma.user.findUnique({ where: { nickname } });
  if (!user) {
    return NextResponse.json({ error: "회원을 찾을 수 없습니다." }, { status: 404 });
  }
  await setSessionNickname(user.nickname);
  return NextResponse.json({ ok: true, nickname: user.nickname });
}
