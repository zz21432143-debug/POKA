import { prisma } from "@/lib/db";
import { DIFFICULTY } from "@/lib/practice";
import { displayMarkSrc } from "@/lib/mark-assets";
import { getRanking, rankScoreLabel } from "@/lib/ranking";
import { loadTitleConfig, rankingRows } from "@/lib/pot-titles";
import { PERIOD_LABEL } from "@/lib/pot-title-config";

/** 홈 랭킹 한 줄 */
export type HomeRankRow = { rank: number; nickname: string; level: number; markUrl: string; score: string };
export type HomeRankBoard = { key: "level" | "marks" | "pot"; title: string; note: string; href: string; rows: HomeRankRow[] };

/** 홈에 보일 순위 수 */
const TOP = 5;
/** 홈은 많이 열리므로 잠깐 담아 둠(랭킹은 몇 분 늦어도 괜찮음) */
const CACHE_MS = 2 * 60_000;
let cache: { at: number; boards: HomeRankBoard[] } | null = null;

/** 팟 계산 시간 1분 23초 */
function duration(ms: number) {
  const sec = Math.round(ms / 1000);
  return sec >= 60 ? `${Math.floor(sec / 60)}분 ${sec % 60}초` : `${sec}초`;
}

/** 홈: 레벨 · 마크 수집 · 팟 계산 랭킹 TOP 5 */
export async function getHomeRankings(): Promise<HomeRankBoard[]> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.boards;
  const [level, marks, pot] = await Promise.all([
    getRanking("level", "all").catch(() => []),
    getRanking("marks", "all").catch(() => []),
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
    {
      key: "marks",
      title: "마크 랭킹",
      note: "모은 요괴 마크 종수",
      href: "/ranking?tab=marks",
      rows: marks.slice(0, TOP).map((r) => ({ rank: r.rank, nickname: r.nickname, level: r.level, markUrl: r.markUrl, score: rankScoreLabel("marks", r.score) })),
    },
    pot ?? { key: "pot", title: "팟 계산 랭킹", note: "", href: "/tools/practice", rows: [] },
  ];
  cache = { at: Date.now(), boards };
  return boards;
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
        score: `${r.correct}문제 · ${duration(r.durationMs)}`,
      };
    }),
  };
}
