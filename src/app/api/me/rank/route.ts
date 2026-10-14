import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";
import { getMyRanks } from "@/lib/my-rank";

export const dynamic = "force-dynamic";

/** 내정보 창: 내 랭킹(레벨 · 주간 경험치 · 마크 · 출석 · 팟 계산) */
export async function GET() {
  const viewer = await getCurrentUser().catch(() => null);
  if (!viewer) return NextResponse.json({ error: "로그인해 주세요." }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { id: viewer.id }, select: { id: true, nickname: true, level: true, exp: true, isMaster: true } });
  if (!user) return NextResponse.json({ error: "회원을 찾을 수 없습니다." }, { status: 404 });
  return NextResponse.json({ ranks: await getMyRanks(user) }, { headers: { "Cache-Control": "no-store" } });
}
