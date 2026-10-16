import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { todayKstDate } from "@/lib/dates";

/** 게임 렉 신고(기기 · 측정 프레임) — 한 사람 하루 5번까지 */
export async function POST(request: Request) {
  const user = await getCurrentUser().catch(() => null);
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const game = body.game === "yut" ? "yut" : body.game === "omok" ? "omok" : null;
  if (!game) return NextResponse.json({ ok: false }, { status: 400 });
  const owner = user?.id ?? "guest";
  const day = todayKstDate();
  const mine = await prisma.toolSaved.count({ where: { ownerId: owner, kind: "lag-report", name: { startsWith: day } } }).catch(() => 0);
  if (mine >= 5) return NextResponse.json({ ok: true, limited: true });
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? Math.round(v * 100) / 100 : null);
  const data = {
    game,
    fps: num(body.fps),
    lite: body.lite === true,
    w: num(body.w),
    h: num(body.h),
    dpr: num(body.dpr),
    path: typeof body.path === "string" ? body.path.slice(0, 80) : "",
    ua: (request.headers.get("user-agent") ?? "").slice(0, 200),
    nick: user?.nickname ?? null,
  };
  await prisma.toolSaved.create({ data: { ownerId: owner, kind: "lag-report", name: `${day}:${game}`, dataJson: JSON.stringify(data) } }).catch(() => undefined);
  return NextResponse.json({ ok: true });
}
