import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin, requireMaster } from "@/lib/admin";
import { clientIp } from "@/lib/request";
import { DIFFICULTIES, DIFFICULTY, kindOf, type Difficulty } from "@/lib/practice";
import { clearPotTitleCache, getHonorInfo, getPotTitleInfo, loadTitleConfig, rankingRows, saveTitleConfig } from "@/lib/pot-titles";
import { normalizeTitleConfig, type TitlePeriod } from "@/lib/pot-title-config";
import { clearHomeRankings } from "@/lib/home-rankings";

export const dynamic = "force-dynamic";

const asDifficulty = (v: unknown, fallback: Difficulty) => (DIFFICULTIES.includes(v as Difficulty) ? (v as Difficulty) : fallback);
const asPeriod = (v: unknown, fallback: TitlePeriod): TitlePeriod => (v === "month" ? "month" : v === "all" ? "all" : fallback);

/** 화면에 보낼 것: 설정 · 지금 칭호 받는 사람 · 고른 난이도/기간 랭킹(30명, 사람마다 기록 수) · 제외 회원 */
async function snapshot(difficulty?: Difficulty, period?: TitlePeriod) {
  const config = await loadTitleConfig();
  const d = difficulty ?? config.difficulty;
  const p = period ?? config.period;
  const [info, honors, rows, excludedUsers, rankExcludedUsers] = await Promise.all([
    getPotTitleInfo(),
    getHonorInfo().catch(() => null),
    rankingRows(d, p, 30),
    config.excluded.length ? prisma.user.findMany({ where: { id: { in: config.excluded } }, select: { id: true, nickname: true } }) : [],
    config.rankExcluded.length ? prisma.user.findMany({ where: { id: { in: config.rankExcluded } }, select: { id: true, nickname: true } }) : [],
  ]);
  const counts = rows.length
    ? await prisma.dealerDrillRun.groupBy({ by: ["userId"], where: { kind: kindOf(d), userId: { in: rows.map((r) => r.userId) } }, _count: { _all: true } })
    : [];
  const countOf = new Map(counts.map((c) => [c.userId, c._count._all]));
  return {
    config,
    holders: info.holders,
    view: { difficulty: d, period: p },
    rows: rows.map((r) => ({ ...r, runs: countOf.get(r.userId) ?? 0, excluded: config.excluded.includes(r.userId) })),
    excludedUsers,
    honorOwners: honors?.owners ?? null,
    rankExcludedUsers: rankExcludedUsers.map((u) => ({ ...u, note: config.rankNotes[u.id] ?? "" })),
  };
}

export async function GET(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;
  const params = new URL(request.url).searchParams;
  const config = await loadTitleConfig();
  return NextResponse.json(await snapshot(asDifficulty(params.get("difficulty"), config.difficulty), asPeriod(params.get("period"), config.period)), {
    headers: { "Cache-Control": "no-store" },
  });
}

/** 설정 바꾸기(마스터): { enabled?, names?, difficulty?, period? } */
export async function PATCH(request: Request) {
  const { error } = await requireMaster();
  if (error) return error;
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const current = await loadTitleConfig();
  const next = normalizeTitleConfig({
    ...current,
    ...body,
    names: { ...current.names, ...((body.names as object) ?? {}) },
    honors: { ...current.honors, ...((body.honors as object) ?? {}) },
    excluded: current.excluded,
    rankExcluded: current.rankExcluded,
    rankNotes: current.rankNotes,
  });
  await saveTitleConfig(next);
  return NextResponse.json({ ok: true, ...(await snapshot()) });
}

/**
 * 회원 관리(마스터):
 * - { type: "exclude" | "include", userId } 칭호 제외 / 제외 해제(랭킹에는 남음)
 * - { type: "deleteRecords", userId, difficulty } 그 난이도 기록 모두 삭제(부정 기록 등). 기록은 되돌릴 수 없음
 */
export async function POST(request: Request) {
  const { user, error } = await requireMaster();
  if (error) return error;
  const body = (await request.json().catch(() => ({}))) as { type?: string; userId?: string; nickname?: string; note?: string; difficulty?: string; view?: { difficulty?: string; period?: string } };
  let userId = String(body.userId ?? "");
  // 랭킹 제외는 닉네임으로도 고를 수 있음
  if (!userId && typeof body.nickname === "string" && body.nickname.trim()) {
    userId = (await prisma.user.findUnique({ where: { nickname: body.nickname.trim() }, select: { id: true } }))?.id ?? "";
    if (!userId) return NextResponse.json({ error: "그 닉네임의 회원이 없습니다." }, { status: 400 });
  }
  if (!userId) return NextResponse.json({ error: "회원을 확인하세요." }, { status: 400 });
  const config = await loadTitleConfig();
  if (body.type === "rankExclude" || body.type === "rankInclude") {
    const rankExcluded = body.type === "rankExclude" ? [...new Set([...config.rankExcluded, userId])] : config.rankExcluded.filter((id) => id !== userId);
    // 메모: 뺄 때 적은 까닭(다시 넣으면 지움)
    const rankNotes = { ...config.rankNotes };
    if (body.type === "rankExclude" && typeof body.note === "string" && body.note.trim()) rankNotes[userId] = body.note;
    if (body.type === "rankInclude") delete rankNotes[userId];
    await saveTitleConfig(normalizeTitleConfig({ ...config, rankExcluded, rankNotes }));
    clearHomeRankings();
  } else if (body.type === "exclude" || body.type === "include") {
    const excluded = body.type === "exclude" ? [...new Set([...config.excluded, userId])] : config.excluded.filter((id) => id !== userId);
    await saveTitleConfig({ ...config, excluded });
  } else if (body.type === "deleteRecords") {
    const difficulty = asDifficulty(body.difficulty, config.difficulty);
    const target = await prisma.user.findUnique({ where: { id: userId }, select: { nickname: true } });
    const deleted = await prisma.dealerDrillRun.deleteMany({ where: { userId, kind: kindOf(difficulty) } });
    await prisma.auditLog.create({
      data: {
        kind: "POT_RECORDS_DELETE",
        userId: user!.id,
        ip: clientIp(request),
        detail: JSON.stringify({ target: userId, nickname: target?.nickname ?? null, difficulty: DIFFICULTY[difficulty].label, deleted: deleted.count }),
      },
    });
    clearPotTitleCache();
  } else {
    return NextResponse.json({ error: "요청을 확인하세요." }, { status: 400 });
  }
  const view = await loadTitleConfig();
  return NextResponse.json({
    ok: true,
    ...(await snapshot(asDifficulty(body.view?.difficulty, view.difficulty), asPeriod(body.view?.period, view.period))),
  });
}
