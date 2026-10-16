import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { todayKstDate } from "@/lib/dates";

/** 결과 공유 버튼을 누른 횟수(관리 홈에서 홍보 효과 보기) — 한 사람 하루 20번까지만 셈 */
export async function POST(request: Request) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as { game?: unknown };
  const game = body.game === "yut" ? "yut" : body.game === "omok" ? "omok" : null;
  if (!game) return NextResponse.json({ ok: false }, { status: 400 });
  const day = todayKstDate();
  const mine = await prisma.toolSaved.count({ where: { ownerId: user.id, kind: "game-share", name: { startsWith: day } } }).catch(() => 0);
  if (mine < 20) await prisma.toolSaved.create({ data: { ownerId: user.id, kind: "game-share", name: `${day}:${game}`, dataJson: "{}" } }).catch(() => undefined);
  return NextResponse.json({ ok: true });
}
