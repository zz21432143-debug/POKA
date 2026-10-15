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
export const RANK_MIN_GAMES = 5;
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
  if (made.count === 1 && r.winnerId && loserId && rewardsOn())
    await rewardWin(r.game, r.winnerId, loserId).catch(() => undefined);
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
  if (today > WIN_REWARD.perDay || vsSame > WIN_REWARD.perOpponentPerDay)
    return;
  const { grantRewards } = await import("@/lib/exp");
  await grantRewards(winnerId, WIN_REWARD.exp, WIN_REWARD.points);
  // 대표 요괴 친밀도도
  const { addMainAffection } = await import("@/lib/yokai-server");
  await addMainAffection(winnerId, WIN_REWARD.affection).catch(() => undefined);
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

export type GameRankRow = {
  rank: number;
  nickname: string;
  wins: number;
  losses: number;
  draws: number;
  score: number;
  rate: number;
};

/**
 * 랭킹: 점수 = 승 3 · 무 1(기간 안 · 5판 이상). 같으면 승률 → 먼저 이긴 사람.
 * period: "month"(이번 달 KST) · "all"
 */
export async function gameRanking(
  game: GameKind,
  period: "month" | "all" = "month",
  limit = 20,
): Promise<GameRankRow[]> {
  const start =
    period === "month"
      ? new Date(`${todayKstDate().slice(0, 7)}-01T00:00:00+09:00`)
      : new Date(0);
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
      SELECT "playerAId" AS uid, "winnerId", "loserId", draw, "createdAt" FROM "GameResult" WHERE game = ${game} AND "createdAt" >= ${start}
      UNION ALL
      SELECT "playerBId" AS uid, "winnerId", "loserId", draw, "createdAt" FROM "GameResult" WHERE game = ${game} AND "createdAt" >= ${start}
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
        score: r.wins * 3 + r.draws,
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
      nickname: r.nickname,
      wins: r.wins,
      losses: r.losses,
      draws: r.draws,
      score: r.score,
      rate: r.rate,
    }));
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
