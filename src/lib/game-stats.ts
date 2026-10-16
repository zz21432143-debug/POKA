import { prisma } from "@/lib/db";
import { todayKstDate } from "@/lib/dates";

/**
 * 게임 전적 · 랭킹(오목 · 윷놀이 · 체스 공통). 친구 대전 결과만(서버가 판정한 판).
 * 전적 · 랭킹 공개(GAME_STATS_PUBLIC=0이면 숨김) · 이긴 보상 켜짐(GAME_REWARDS=0이면 끔). 기권은 그냥 패.
 * 마스터는 /games/stats에서 미리 볼 수 있음(어디에도 링크 없음).
 */
export type GameKind = "omok" | "yut" | "chess";
export const GAME_LABEL: Record<GameKind, string> = {
  omok: "오목",
  yut: "윷놀이",
  chess: "체스",
};
export const isGameKind = (v: unknown): v is GameKind =>
  v === "omok" || v === "yut" || v === "chess";

/** 전적에 넣는 최소 수(너무 짧은 판 = 바로 기권 장난은 빼기) */
export const MIN_COUNTED_MOVES: Record<GameKind, number> = {
  omok: 9,
  yut: 12,
  chess: 10,
};
/** 랭킹에 오르는 최소 판 수 */
export const RANK_MIN_GAMES = 3;
/** 보상(켜졌을 때): 이긴 사람 · 하루 횟수 · 같은 상대 하루 횟수 */
import { WIN_REWARD } from "@/lib/game-config";
export { WIN_REWARD };

/** 전적 · 랭킹 화면: 기본 공개(GAME_STATS_PUBLIC=0이면 숨김) */
export const gameStatsVisible = () => process.env.GAME_STATS_PUBLIC !== "0";
/** 이긴 보상: 기본 켜짐(GAME_REWARDS=0이면 끔) */
export const rewardsOn = () => process.env.GAME_REWARDS !== "0";

/** 끝난 판 기록(한 판에 한 번 · 짧은 판 · 취소는 안 셈) */
export async function recordGameResult(r: {
  game: GameKind;
  gameId: string;
  playerAId: string;
  playerBId: string;
  /** 이긴 사람(무승부면 null) */
  winnerId: string | null;
  reason: string;
  moves: number;
}) {
  if (
    r.reason === "cancel" ||
    r.moves < MIN_COUNTED_MOVES[r.game] ||
    r.playerAId === r.playerBId
  )
    return false;
  const loserId = r.winnerId
    ? r.winnerId === r.playerAId
      ? r.playerBId
      : r.playerAId
    : null;
  const made = await prisma.gameResult
    .createMany({
      data: [
        {
          game: r.game,
          gameId: r.gameId,
          playerAId: r.playerAId,
          playerBId: r.playerBId,
          winnerId: r.winnerId,
          loserId,
          draw: !r.winnerId,
          reason: r.reason,
          moves: r.moves,
        },
      ],
      skipDuplicates: true,
    })
    .catch(() => ({ count: 0 }));
  if (made.count === 1 && r.winnerId && loserId && rewardsOn()) {
    await rewardWin(r.game, r.winnerId, loserId).catch(() => undefined);
    await rewardLose(r.game, loserId).catch(() => undefined);
  }
  return made.count === 1;
}

/** 이긴 보상(꺼져 있음): 하루 5번 · 같은 상대는 하루 2번까지(서로 져 주기 막기) */
async function rewardWin(game: GameKind, winnerId: string, loserId: string) {
  const since = new Date(`${todayKstDate()}T00:00:00+09:00`);
  const [today, vsSame] = await Promise.all([
    prisma.gameResult.count({
      where: { game, winnerId, createdAt: { gte: since } },
    }),
    prisma.gameResult.count({
      where: { game, winnerId, loserId, createdAt: { gte: since } },
    }),
  ]);
  const R = await import("@/lib/game-reward").then((m) => m.loadWinReward()).catch(() => WIN_REWARD);
  if (today > R.perDay || vsSame > R.perOpponentPerDay) return;
  const { grantRewards } = await import("@/lib/exp");
  await grantRewards(winnerId, R.exp, R.points);
  // 대표 요괴 친밀도도
  const { addMainAffection } = await import("@/lib/yokai-server");
  await addMainAffection(winnerId, R.affection).catch(() => undefined);
}

/** 진 사람 위로 경험치(하루 LOSE_REWARD.perDay판까지) */
export async function rewardLose(game: GameKind, loserId: string) {
  const { LOSE_REWARD } = await import("@/lib/game-config");
  const since = new Date(`${todayKstDate()}T00:00:00+09:00`);
  const today = await prisma.gameResult.count({ where: { game, loserId, createdAt: { gte: since } } });
  if (today > LOSE_REWARD.perDay) return;
  const { grantRewards } = await import("@/lib/exp");
  await grantRewards(loserId, LOSE_REWARD.exp, 0);
}

export type GameRecord = {
  games: number;
  wins: number;
  /** 진 판(기권 포함) */
  losses: number;
  /** 그중 기권 */
  resigns: number;
  draws: number;
  rate: number;
  streak: number;
};

/** 「12승 3패」(기권도 패) · 무승부가 있으면 「1무」 */
export function recordLine(r: Pick<GameRecord, "wins" | "losses" | "draws">) {
  return `${r.wins}승 ${r.losses}패${r.draws ? ` ${r.draws}무` : ""}`;
}

/** 내 전적(승 · 패 · 무 · 승률 · 지금 연승) */
export async function gameRecord(
  userId: string,
  game: GameKind,
): Promise<GameRecord> {
  const where = { game, OR: [{ playerAId: userId }, { playerBId: userId }] };
  const [wins, losses, resigns, games, last] = await Promise.all([
    prisma.gameResult.count({ where: { game, winnerId: userId } }),
    prisma.gameResult.count({ where: { game, loserId: userId } }),
    prisma.gameResult.count({
      where: { game, loserId: userId, reason: "resign" },
    }),
    prisma.gameResult.count({ where }),
    prisma.gameResult.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 50,
      select: { winnerId: true },
    }),
  ]);
  let streak = 0;
  for (const r of last) {
    if (r.winnerId !== userId) break;
    streak += 1;
  }
  const draws = games - wins - losses;
  return {
    games,
    wins,
    losses,
    resigns,
    draws,
    rate: games ? Math.round((wins / games) * 100) : 0,
    streak,
  };
}

/** 랭킹 점수: 승 3 · 무 1 · 패 -1(0점 아래로는 안 내려감) — 져도 많이 둘수록 손해가 크지 않게 */
export const RANK_POINTS = { win: 3, draw: 1, loss: -1 } as const;
export function rankScore(r: { wins: number; draws: number; losses: number }) {
  return Math.max(0, r.wins * RANK_POINTS.win + r.draws * RANK_POINTS.draw + r.losses * RANK_POINTS.loss);
}

export type GameRankRow = {
  rank: number;
  userId: string;
  nickname: string;
  wins: number;
  losses: number;
  draws: number;
  score: number;
  rate: number;
};

/**
 * 랭킹: 점수 = 승 3 · 무 1 · 패 -1(기권 · 나가기도 패, 0점 아래로는 안 내려감 · 기간 안 · 3판 이상). 같으면 승률 → 먼저 이긴 사람.
 * period: "month"(이번 달 KST) · "all"
 */
export async function gameRanking(
  game: GameKind,
  period: "month" | "all" = "month",
  limit = 20,
  /** 지난달처럼 정해진 달(YYYY-MM) — 없으면 이번 달 */
  month?: string,
): Promise<GameRankRow[]> {
  const ym = month ?? todayKstDate().slice(0, 7);
  const start =
    period === "month"
      ? new Date(`${ym}-01T00:00:00+09:00`)
      : new Date(0);
  const end = period === "month" ? new Date(`${nextMonth(ym)}-01T00:00:00+09:00`) : new Date(8.64e15);
  const rows = await prisma.$queryRaw<
    {
      id: string;
      nickname: string;
      wins: number;
      losses: number;
      draws: number;
      first: Date;
    }[]
  >`
    WITH p AS (
      SELECT "playerAId" AS uid, "winnerId", "loserId", draw, "createdAt" FROM "GameResult" WHERE game = ${game} AND "createdAt" >= ${start} AND "createdAt" < ${end}
      UNION ALL
      SELECT "playerBId" AS uid, "winnerId", "loserId", draw, "createdAt" FROM "GameResult" WHERE game = ${game} AND "createdAt" >= ${start} AND "createdAt" < ${end}
    )
    SELECT u.id, u.nickname,
      COUNT(*) FILTER (WHERE p."winnerId" = p.uid)::int AS wins,
      COUNT(*) FILTER (WHERE p."loserId" = p.uid)::int AS losses,
      COUNT(*) FILTER (WHERE p.draw)::int AS draws,
      MIN(p."createdAt") FILTER (WHERE p."winnerId" = p.uid) AS first
    FROM p JOIN "User" u ON u.id = p.uid
    WHERE u."withdrawnAt" IS NULL
    GROUP BY u.id
    HAVING COUNT(*) >= ${RANK_MIN_GAMES}
  `.catch(() => []);
  return rows
    .map((r) => {
      const games = r.wins + r.losses + r.draws;
      return {
        ...r,
        score: rankScore(r),
        rate: games ? Math.round((r.wins / games) * 100) : 0,
      };
    })
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.rate - a.rate ||
        (a.first?.getTime() ?? Infinity) - (b.first?.getTime() ?? Infinity),
    )
    .slice(0, limit)
    .map((r, i) => ({
      rank: i + 1,
      userId: r.id,
      nickname: r.nickname,
      wins: r.wins,
      losses: r.losses,
      draws: r.draws,
      score: r.score,
      rate: r.rate,
    }));
}

const nextMonth = (ym: string) => {
  const [y, m] = ym.split("-").map(Number);
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
};
const prevMonth = (ym: string) => {
  const [y, m] = ym.split("-").map(Number);
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
};

/** 월말 게임 랭킹 보상(1 · 2 · 3위) */
export const MONTH_RANK_REWARD = [650, 390, 260] as const;
/** 이 달부터 지급(그 전 달은 테스트 판이 섞여 있어 안 줌) */
const MONTH_REWARD_FROM = "2026-10";

/** 지난달 오목 · 윷 랭킹 1~3위에게 포인트(달마다 한 번 · 매일 크론에서 불러도 같은 결과) */
export async function payMonthlyGameRewards(today = todayKstDate()) {
  const month = prevMonth(today.slice(0, 7));
  if (month < MONTH_REWARD_FROM) return [];
  const paid: string[] = [];
  for (const game of ["omok", "yut"] as const) {
    const rows = await gameRanking(game, "month", 3, month);
    if (!rows.length) continue;
    const mark = await prisma.toolSaved
      .createMany({ data: [{ id: `gamerank_${game}_${month}`, ownerId: "site", kind: "game-month-reward", name: month, dataJson: JSON.stringify(rows.map((r) => r.nickname)) }], skipDuplicates: true })
      .catch(() => ({ count: 0 }));
    if (mark.count !== 1) continue;
    const { grantRewards } = await import("@/lib/exp");
    for (const r of rows) {
      const points = MONTH_RANK_REWARD[r.rank - 1] ?? 0;
      if (points) await grantRewards(r.userId, 0, points, { ignorePointCap: true }).catch(() => undefined);
    }
    const { pushTicker } = await import("@/lib/ticker");
    await pushTicker({
      kind: `GAMERANK:${game}:${month}`,
      message: `🏆 ${Number(month.slice(5))}월 ${GAME_LABEL[game]} 랭킹 ${rows.map((r) => `${r.rank}위 ${r.nickname}`).join(" · ")} — 축하해요!`,
      href: "/ranking",
    }).catch(() => undefined);
    paid.push(game);
  }
  return paid;
}

/** 두 사람 상대 전적(a 승 · b 승 · 무) */
export async function headToHead(game: GameKind, a: string, b: string) {
  const pair = {
    game,
    OR: [
      { playerAId: a, playerBId: b },
      { playerAId: b, playerBId: a },
    ],
  };
  const [aWins, bWins, all] = await Promise.all([
    prisma.gameResult.count({ where: { ...pair, winnerId: a } }),
    prisma.gameResult.count({ where: { ...pair, winnerId: b } }),
    prisma.gameResult.count({ where: pair }),
  ]);
  return { a: aWins, b: bWins, draws: all - aWins - bWins };
}

/** 상대별 전적: 내가 둔 상대마다 승 · 패 · 무(많이 둔 순) */
export async function opponentRecords(
  userId: string,
  game: GameKind,
  limit = 10,
) {
  const rows = await prisma.$queryRaw<
    {
      opp: string;
      nickname: string;
      wins: number;
      losses: number;
      draws: number;
      games: number;
    }[]
  >`
    SELECT o.opp, u.nickname,
      COUNT(*) FILTER (WHERE r."winnerId" = ${userId})::int AS wins,
      COUNT(*) FILTER (WHERE r."loserId" = ${userId})::int AS losses,
      COUNT(*) FILTER (WHERE r.draw)::int AS draws,
      COUNT(*)::int AS games
    FROM "GameResult" r
    CROSS JOIN LATERAL (SELECT CASE WHEN r."playerAId" = ${userId} THEN r."playerBId" ELSE r."playerAId" END AS opp) o
    JOIN "User" u ON u.id = o.opp
    WHERE r.game = ${game} AND (r."playerAId" = ${userId} OR r."playerBId" = ${userId}) AND u."withdrawnAt" IS NULL
    GROUP BY o.opp, u.nickname
    ORDER BY games DESC, MAX(r."createdAt") DESC
    LIMIT ${limit}
  `.catch(() => []);
  return rows.map((r) => ({
    nickname: r.nickname,
    wins: r.wins,
    losses: r.losses,
    draws: r.draws,
    games: r.games,
  }));
}
