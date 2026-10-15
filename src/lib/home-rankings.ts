import { prisma } from "@/lib/db";
import { DIFFICULTY } from "@/lib/practice";
import { displayMarkSrc } from "@/lib/mark-assets";
import { getRanking, rankOrder } from "@/lib/ranking";
import { getWeekSnapshot } from "@/lib/my-rank";
import { loadTitleConfig, rankingRows } from "@/lib/pot-titles";
import { PERIOD_LABEL } from "@/lib/pot-title-config";

/** 홈 랭킹 한 줄 */
export type HomeRankRow = { rank: number; nickname: string; level: number; markUrl: string; score: string };
export type HomeRankBoard = { key: "level" | "marks" | "pot" | "omok"; title: string; note: string; href: string; rows: HomeRankRow[] };

/** 홈에 보일 순위 수 */
const TOP = 5;
/** 홈은 많이 열리므로 잠깐 담아 둠(랭킹은 몇 분 늦어도 괜찮음) */
const CACHE_MS = 2 * 60_000;
let cache: { at: number; boards: HomeRankBoard[] } | null = null;

/** 랭킹 제외 등 설정이 바뀌면 바로 다시 계산 */
export function clearHomeRankings() {
  cache = null;
}

/** 홈: 레벨 · 오목(이번 달) · 팟 계산 랭킹 TOP 5 */
export async function getHomeRankings(): Promise<HomeRankBoard[]> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.boards;
  const [level, omok, pot] = await Promise.all([
    getRanking("level", "all").catch(() => []),
    omokBoard().catch(() => null),
    potBoard().catch(() => null),
  ]);
  const boards: HomeRankBoard[] = [
    {
      key: "level",
      title: "레벨 랭킹",
      note: "전체 · 레벨 순",
      href: "/ranking?tab=level",
      rows: level.slice(0, TOP).map((r) => ({ rank: r.rank, nickname: r.nickname, level: r.level, markUrl: r.markUrl, score: `Lv.${r.level}` })),
    },
    omok ?? { key: "omok", title: "오목 랭킹", note: "이번 달", href: "/games/omok", rows: [] },
    pot ?? { key: "pot", title: "팟 계산 랭킹", note: "", href: "/tools/practice", rows: [] },
  ];
  cache = { at: Date.now(), boards };
  return boards;
}

/** 오목: 이번 달 랭킹(승 3점 · 무 1점 · 3판 이상) */
async function omokBoard(): Promise<HomeRankBoard> {
  const { gameRanking } = await import("@/lib/game-stats");
  const rows = (await gameRanking("omok", "month", TOP)).slice(0, TOP);
  const users = await prisma.user.findMany({ where: { nickname: { in: rows.map((r) => r.nickname) } }, select: { nickname: true, level: true, isMaster: true, profileMarkImageUrl: true } });
  const by = new Map(users.map((u) => [u.nickname, u]));
  return {
    key: "omok",
    title: "오목 랭킹",
    note: "이번 달 · 승 3점",
    href: "/games/omok",
    rows: rows.map((r) => ({ rank: r.rank, nickname: r.nickname, level: by.get(r.nickname)?.level ?? 1, markUrl: displayMarkSrc({ isMaster: Boolean(by.get(r.nickname)?.isMaster), profileMarkImageUrl: by.get(r.nickname)?.profileMarkImageUrl ?? null }), score: `${r.wins}승 ${r.losses}패` })),
  };
}

/** 팟 계산: 칭호 기준 난이도 · 기간 랭킹(맞힌 수 → 빠른 순) */
async function potBoard(): Promise<HomeRankBoard> {
  const config = await loadTitleConfig();
  const rows = await rankingRows(config.difficulty, config.period, TOP);
  const users = await prisma.user.findMany({
    where: { id: { in: rows.map((r) => r.userId) } },
    select: { id: true, level: true, isMaster: true, profileMarkImageUrl: true },
  });
  const byId = new Map(users.map((u) => [u.id, u]));
  return {
    key: "pot",
    title: "팟 계산 랭킹",
    note: `${DIFFICULTY[config.difficulty].label} · ${PERIOD_LABEL[config.period]}`,
    href: "/tools/practice",
    rows: rows.map((r, i) => {
      const u = byId.get(r.userId);
      return {
        rank: i + 1,
        nickname: r.nickname,
        level: u?.level ?? 1,
        markUrl: displayMarkSrc({ isMaster: u?.isMaster ?? false, profileMarkImageUrl: u?.profileMarkImageUrl ?? null }),
        // 이름이 잘리지 않게 점수(문제 수 · 시간)는 홈에서 빼고 순위만
        score: "",
      };
    }),
  };
}

/** 이번 주 급상승: 레벨 · 마크 전체 랭킹에서 이번 주 시작보다 가장 많이 오른 회원(오른 회원이 없으면 null) */
export type WeeklyRiser = { nickname: string; label: string; rank: number; change: number };
let riserCache: { at: number; riser: WeeklyRiser | null } | null = null;

export async function getWeeklyRiser(): Promise<WeeklyRiser | null> {
  if (riserCache && Date.now() - riserCache.at < CACHE_MS) return riserCache.riser;
  const snap = await getWeekSnapshot().catch(() => null);
  let best: { userId: string; label: string; rank: number; change: number } | null = null;
  if (snap) {
    for (const [key, label] of [["level", "레벨"], ["marks", "마크"]] as const) {
      const order = await rankOrder(key, "all").catch(() => []);
      order.forEach((row, i) => {
        const before = snap[key]?.[row.userId];
        const change = before == null ? 0 : before - (i + 1);
        if (change > 0 && (!best || change > best.change)) best = { userId: row.userId, label, rank: i + 1, change };
      });
    }
  }
  const pick = best as { userId: string; label: string; rank: number; change: number } | null;
  const user = pick ? await prisma.user.findUnique({ where: { id: pick.userId }, select: { nickname: true } }).catch(() => null) : null;
  const riser = pick && user ? { nickname: user.nickname, label: pick.label, rank: pick.rank, change: pick.change } : null;
  riserCache = { at: Date.now(), riser };
  return riser;
}
