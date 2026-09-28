import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";
import { grantRewards } from "@/lib/exp";

const KINDS = new Set(["SIDE_POT", "MIN_RAISE"]);
const TOTAL = 10;

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ saved: false, reason: "login" }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  const kind = typeof body?.kind === "string" ? body.kind : "";
  const correct = Number(body?.correct);
  const total = Number(body?.total);
  const durationMs = Number(body?.durationMs);
  if (!KINDS.has(kind) || total !== TOTAL || !Number.isInteger(correct) || correct < 0 || correct > TOTAL) {
    return NextResponse.json({ error: "기록이 올바르지 않습니다." }, { status: 400 });
  }
  if (!Number.isFinite(durationMs) || durationMs < 1 || durationMs > 30 * 60 * 1000) {
    return NextResponse.json({ error: "시간 기록이 올바르지 않습니다." }, { status: 400 });
  }

  const run = await prisma.dealerDrillRun.create({
    data: { userId: user.id, kind, correct, total, durationMs: Math.round(durationMs) },
  });

  let exp = 0;
  let points = 0;
  if (correct === TOTAL) {
    exp = 20;
    points = 6;
  } else if (correct >= 7) {
    exp = 12;
    points = 3;
  }
  if (exp > 0) {
    await grantRewards(user.id, exp, points).catch(() => null);
  }

  return NextResponse.json({ saved: true, id: run.id, exp, points });
}
