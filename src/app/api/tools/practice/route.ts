import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { canUseDealerTools } from "@/lib/dealer-tools-access";
import { PRACTICE_KINDS, ROUND_SIZE, type PracticeKind } from "@/lib/practice";

export const dynamic = "force-dynamic";

const KINDS = Object.keys(PRACTICE_KINDS) as PracticeKind[];
const TOP = 10;

type Row = { nickname: string; correct: number; durationMs: number; at: string; mine: boolean };

/** 종류별: 사람마다 최고 기록(맞힌 수 많은 순 → 빠른 순) 상위 10명 + 내 최고 기록 */
async function board(userId: string) {
  const result: Record<string, { top: Row[]; best: Row | null }> = {};
  for (const kind of KINDS) {
    const runs = await prisma.dealerDrillRun.findMany({
      where: { kind },
      orderBy: [{ correct: "desc" }, { durationMs: "asc" }, { createdAt: "asc" }],
      take: 400,
      select: { userId: true, correct: true, durationMs: true, createdAt: true, user: { select: { nickname: true } } },
    });
    const seen = new Set<string>();
    const top: Row[] = [];
    for (const run of runs) {
      if (seen.has(run.userId)) continue;
      seen.add(run.userId);
      if (top.length < TOP) {
        top.push({ nickname: run.user.nickname, correct: run.correct, durationMs: run.durationMs, at: run.createdAt.toISOString(), mine: run.userId === userId });
      }
    }
    const mine = await prisma.dealerDrillRun.findFirst({
      where: { kind, userId },
      orderBy: [{ correct: "desc" }, { durationMs: "asc" }],
      select: { correct: true, durationMs: true, createdAt: true },
    });
    result[kind] = { top, best: mine ? { nickname: "", correct: mine.correct, durationMs: mine.durationMs, at: mine.createdAt.toISOString(), mine: true } : null };
  }
  return result;
}

export async function GET() {
  const user = await getCurrentUser().catch(() => null);
  if (!user || !canUseDealerTools(user)) return NextResponse.json({ error: "로그인하면 쓸 수 있습니다." }, { status: 403 });
  return NextResponse.json({ board: await board(user.id) }, { headers: { "Cache-Control": "no-store" } });
}

/** 한 판 기록 저장: { kind, correct, durationMs } (10문제 기준) */
export async function POST(request: Request) {
  const user = await getCurrentUser().catch(() => null);
  if (!user || !canUseDealerTools(user)) return NextResponse.json({ error: "로그인하면 쓸 수 있습니다." }, { status: 403 });
  const body = (await request.json().catch(() => ({}))) as { kind?: string; correct?: number; durationMs?: number };
  const kind = String(body.kind) as PracticeKind;
  const correct = Math.floor(Number(body.correct));
  const durationMs = Math.floor(Number(body.durationMs));
  // 말이 안 되는 기록은 받지 않습니다(10문제를 3초 안에 다 맞히는 등)
  if (!KINDS.includes(kind) || !(correct >= 0 && correct <= ROUND_SIZE) || !(durationMs >= 3000 && durationMs <= 60 * 60 * 1000)) {
    return NextResponse.json({ error: "기록을 확인하세요." }, { status: 400 });
  }
  await prisma.dealerDrillRun.create({ data: { userId: user.id, kind, correct, total: ROUND_SIZE, durationMs } });
  return NextResponse.json({ ok: true, board: await board(user.id) });
}
