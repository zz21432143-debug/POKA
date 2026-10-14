import { prisma } from "@/lib/db";
import { exactRank, rankExcludedIds, rankOrder, rankScoreLabel } from "@/lib/ranking";
import { shiftDate, todayKstDate, weekStartKst } from "@/lib/dates";
import { pushTicker } from "@/lib/ticker";
import { loadTitleConfig, rankingRows } from "@/lib/pot-titles";
import { DIFFICULTY } from "@/lib/practice";

/** 내 랭킹 한 줄: 순위(없으면 순위 밖) · 점수 · 보러 가기 */
/** change: 이번 주 시작 때보다 몇 계단 올랐는지(+ 오름 · - 내림 · "new" 이번 주 새로 들어옴 · null 비교 안 함) */
export type MyRankRow = { key: string; label: string; short: string; rank: number | null; score: string; href: string; change?: number | "new" | null; before?: number | null };
export type MyRanks = { excluded: false; rows: MyRankRow[] } | { excluded: true; reason: "master" | "admin" };

/** 이번 주 시작 때 순위(레벨 · 마크 · 팟 계산, 상위 1,000명): 그 주에 처음 볼 때 한 번 저장해 오르내림 비교 */
export type RankSnap = Record<"level" | "marks" | "pot", Record<string, number>>;
/** 기준 기간: 이번 주(월요일) · 이번 달(1일) */
export type SnapPeriod = "week" | "month";
const snapCache: Partial<Record<SnapPeriod, { key: string; data: RankSnap }>> = {};

/** 이번 주 시작 때 순위(랭킹 화면 · 홈 급상승에도 씀) */
export async function getWeekSnapshot(period: SnapPeriod = "week"): Promise<RankSnap | null> {
  return weekSnapshot(period, async () => {
    const config = await loadTitleConfig();
    return rankingRows(config.difficulty, config.period, 100_000, 50_000);
  });
}

async function weekSnapshot(period: SnapPeriod, pot: () => Promise<{ userId: string }[]>): Promise<RankSnap | null> {
  // 이번 주: ranksnap_2026-10-12 · 이번 달: ranksnap_m_2026-10
  const week = period === "week" ? weekStartKst() : todayKstDate().slice(0, 7);
  if (snapCache[period]?.key === week) return snapCache[period]!.data;
  const id = period === "week" ? `ranksnap_${week}` : `ranksnap_m_${week}`;
  const read = async () => {
    const row = await prisma.toolSaved.findUnique({ where: { id }, select: { dataJson: true } }).catch(() => null);
    return row ? (JSON.parse(row.dataJson) as RankSnap) : null;
  };
  let data = await read();
  if (!data) {
    const [level, marks, potRows] = await Promise.all([rankOrder("level", "all"), rankOrder("marks", "all"), pot()]);
    const top = (ids: string[]) => Object.fromEntries(ids.slice(0, 1000).map((u, i) => [u, i + 1]));
    const fresh: RankSnap = { level: top(level.map((r) => r.userId)), marks: top(marks.map((r) => r.userId)), pot: top(potRows.map((r) => r.userId)) };
    // 여러 요청이 동시에 와도 한 번만(먼저 저장된 것을 씀)
    const saved = await prisma.toolSaved
      .createMany({ data: [{ id, ownerId: "site", kind: "rank-snapshot", name: week, dataJson: JSON.stringify(fresh) }], skipDuplicates: true })
      .catch(() => ({ count: 0 }));
    data = (await read()) ?? fresh;
    // 새 주를 처음 저장한 요청만: 지난주 급상승 회원을 LIVE 띠에 한 번
    if (period === "week" && saved.count === 1) await announceLastWeekRiser(week, data).catch(() => undefined);
  }
  snapCache[period] = { key: week, data };
  return data;
}

/** 지난주 시작 순위 → 이번 주 시작 순위로 가장 많이 오른 회원(레벨 · 마크)을 LIVE 띠에 */
async function announceLastWeekRiser(week: string, now: RankSnap) {
  const prevWeek = shiftDate(week, -7);
  const row = await prisma.toolSaved.findUnique({ where: { id: `ranksnap_${prevWeek}` }, select: { dataJson: true } });
  if (!row) return;
  const before = JSON.parse(row.dataJson) as RankSnap;
  let best: { userId: string; label: string; change: number } | null = null;
  for (const [key, label] of [["level", "레벨"], ["marks", "마크"]] as const) {
    for (const [userId, rank] of Object.entries(now[key] ?? {})) {
      const was = before[key]?.[userId];
      const change = was == null ? 0 : was - rank;
      if (change > 0 && (!best || change > best.change)) best = { userId, label, change };
    }
  }
  const pick = best as { userId: string; label: string; change: number } | null;
  if (!pick) return;
  const user = await prisma.user.findUnique({ where: { id: pick.userId }, select: { nickname: true } });
  if (!user) return;
  await pushTicker({
    kind: `RISER:${prevWeek}`,
    message: `🔥 지난주 급상승 ${user.nickname}님 · ${pick.label} ▲${pick.change} — 축하해요!`,
    href: `/u/${encodeURIComponent(user.nickname)}#profile`,
  });
}

/**
 * 내 랭킹: 모두 정확한 순위(20위 밖도). 기록이 없으면 「기록 없음」.
 * 마스터 · 랭킹 제외 회원은 랭킹에 없으므로 따로 알려 줌.
 */
export async function getMyRanks(user: { id: string; nickname: string; level: number; exp: number; isMaster: boolean }): Promise<MyRanks> {
  if (user.isMaster) return { excluded: true, reason: "master" };
  const excluded = await rankExcludedIds();
  if (excluded.has(user.id)) return { excluded: true, reason: "admin" };

  const config = await loadTitleConfig();
  const [weekExp, marks, attendance, pot, above] = await Promise.all([
    exactRank("level", "week", user.id).catch(() => null),
    exactRank("marks", "all", user.id).catch(() => null),
    exactRank("attendance", "month", user.id).catch(() => null),
    rankingRows(config.difficulty, config.period, 100_000, 50_000).catch(() => []),
    // 레벨(전체) 정확한 순위: 나보다 레벨이 높거나, 같은 레벨에서 경험치가 많은 회원 수 + 1
    prisma.user
      .count({
        where: {
          withdrawnAt: null,
          isMaster: false,
          id: { notIn: [...excluded] },
          OR: [{ level: { gt: user.level } }, { level: user.level, exp: { gt: user.exp } }],
        },
      })
      .catch(() => null),
  ]);
  const potIndex = pot.findIndex((r) => r.userId === user.id);
  const potRow = potIndex >= 0 ? pot[potIndex] : null;
  const snap = await weekSnapshot("week", async () => pot).catch(() => null);
  const change = (key: keyof RankSnap, rank: number | null): MyRankRow["change"] => {
    if (!snap || rank == null) return null;
    const before = snap[key]?.[user.id];
    return before == null ? "new" : before - rank;
  };
  const beforeOf = (key: keyof RankSnap) => snap?.[key]?.[user.id] ?? null;
  const levelRank = user.exp > 0 && above != null ? above + 1 : null;
  const potRank = potIndex >= 0 ? potIndex + 1 : null;
  return {
    excluded: false,
    rows: [
      { key: "level", label: "레벨(전체)", short: "레벨", rank: levelRank, change: change("level", levelRank), before: beforeOf("level"), score: `Lv.${user.level}`, href: "/ranking?tab=level" },
      { key: "weekExp", label: "이번 주 경험치", short: "주간 경험치", rank: weekExp?.rank ?? null, score: weekExp ? rankScoreLabel("level", weekExp.score, "week") : "-", href: "/ranking?tab=level&period=week" },
      { key: "marks", label: "마크 수집", short: "마크", rank: marks?.rank ?? null, change: change("marks", marks?.rank ?? null), before: beforeOf("marks"), score: marks ? rankScoreLabel("marks", marks.score) : "-", href: "/ranking?tab=marks" },
      { key: "attendance", label: "이번 달 출석", short: "월간 출석", rank: attendance?.rank ?? null, score: attendance ? rankScoreLabel("attendance", attendance.score, "month") : "-", href: "/ranking?tab=attendance&period=month" },
      {
        key: "pot",
        label: `팟 계산(${DIFFICULTY[config.difficulty].label})`,
        short: "팟 계산",
        rank: potRank,
        change: change("pot", potRank),
        before: beforeOf("pot"),
        score: potRow ? `${potRow.correct}문제` : "-",
        href: "/tools/practice",
      },
    ],
  };
}
