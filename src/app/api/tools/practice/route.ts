import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { canUseDealerTools } from "@/lib/dealer-tools-access";
import { DIFFICULTIES, ROUND_SIZE, kindOf } from "@/lib/practice";
import { clearPotTitleCache, getPotTitleInfo, loadTitleConfig, rankingRows } from "@/lib/pot-titles";
import { monthStartKst } from "@/lib/pot-title-config";

export const dynamic = "force-dynamic";

/** 난이도별 기록(sidepot-easy · sidepot-normal · sidepot-hard · sidepot-hell) */
const KINDS = DIFFICULTIES.map(kindOf);
const TOP = 10;

type Row = { nickname: string; correct: number; durationMs: number; at: string; mine: boolean; title?: 1 | 2 | 3 };

/** 난이도별: 사람마다 최고 기록 상위 10명 + 내 최고 기록(기간은 칭호 설정: 전체 / 이번 달) */
async function board(userId: string) {
  const config = await loadTitleConfig();
  // 칭호 받는 사람(제외 회원 빼고 1~3위) → 랭킹 줄 옆에 칭호
  const info = await getPotTitleInfo();
  const since = config.period === "month" ? { createdAt: { gte: monthStartKst() } } : {};
  const result: Record<string, { top: Row[]; best: Row | null }> = {};
  for (const d of DIFFICULTIES) {
    const rows = await rankingRows(d, config.period, TOP);
    const mine = await prisma.dealerDrillRun.findFirst({
      where: { kind: kindOf(d), userId, ...since },
      orderBy: [{ correct: "desc" }, { durationMs: "asc" }],
      select: { correct: true, durationMs: true, createdAt: true },
    });
    result[kindOf(d)] = {
      top: rows.map((r) => ({
        nickname: r.nickname,
        correct: r.correct,
        durationMs: r.durationMs,
        at: r.at,
        mine: r.userId === userId,
        ...(info.enabled && info.holders[r.nickname] ? { title: info.holders[r.nickname] } : {}),
      })),
      best: mine ? { nickname: "", correct: mine.correct, durationMs: mine.durationMs, at: mine.createdAt.toISOString(), mine: true } : null,
    };
  }
  return {
    board: result,
    period: config.period,
    titles: { enabled: info.enabled, names: info.names, difficulty: info.difficulty, period: info.period },
  };
}

export async function GET() {
  const user = await getCurrentUser().catch(() => null);
  if (!user || !canUseDealerTools(user)) return NextResponse.json({ error: "로그인하면 쓸 수 있습니다." }, { status: 403 });
  return NextResponse.json(await board(user.id), { headers: { "Cache-Control": "no-store" } });
}

/** 한 판 기록 저장: { kind, correct, durationMs } (10문제 기준) */
export async function POST(request: Request) {
  const user = await getCurrentUser().catch(() => null);
  if (!user || !canUseDealerTools(user)) return NextResponse.json({ error: "로그인하면 쓸 수 있습니다." }, { status: 403 });
  const body = (await request.json().catch(() => ({}))) as { kind?: string; correct?: number; durationMs?: number };
  const kind = String(body.kind);
  const correct = Math.floor(Number(body.correct));
  const durationMs = Math.floor(Number(body.durationMs));
  // 말이 안 되는 기록은 받지 않습니다(10문제를 3초 안에 다 맞히는 등)
  if (!KINDS.includes(kind) || !(correct >= 0 && correct <= ROUND_SIZE) || !(durationMs >= 3000 && durationMs <= 60 * 60 * 1000)) {
    return NextResponse.json({ error: "기록을 확인하세요." }, { status: 400 });
  }
  await prisma.dealerDrillRun.create({ data: { userId: user.id, kind, correct, total: ROUND_SIZE, durationMs } });
  clearPotTitleCache();
  return NextResponse.json({ ok: true, ...(await board(user.id)) });
}
