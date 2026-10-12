import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { todayKstDate, weekStartKst } from "@/lib/dates";
import { displayMarkSrc } from "@/lib/mark-assets";
import { ensureExpLedger } from "@/lib/exp-ledger";
import { shiftDate } from "@/lib/dates";
import { SHOP_MARKS } from "@/lib/yokai-marks";

/** level: 레벨 높은 순(같은 레벨이면 경험치 많은 순). 예전 points 주소는 level로 엽니다. */
export type RankTab = "level" | "marks" | "attendance";
export type RankPeriod = "all" | "week" | "month";

export type RankRow = {
  rank: number;
  nickname: string;
  level: number;
  score: number;
  markUrl: string;
};

const YOKAI_SLUGS = SHOP_MARKS.map((mark) => mark.slug);

export function parseRankTab(value: string | undefined): RankTab {
  if (value === "marks" || value === "attendance") return value;
  return "level";
}


export function parseRankPeriod(value: string | undefined): RankPeriod {
  if (value === "week" || value === "month") return value;
  return "all";
}

function periodStart(period: RankPeriod): Date | null {
  if (period === "all") return null;
  if (period === "week") return new Date(`${weekStartKst()}T00:00:00+09:00`);
  return new Date(`${todayKstDate().slice(0, 7)}-01T00:00:00+09:00`);
}

function periodDate(period: RankPeriod): string | null {
  if (period === "all") return null;
  if (period === "week") return weekStartKst();
  return `${todayKstDate().slice(0, 7)}-01`;
}

type RawRow = {
  nickname: string;
  level: number;
  score: number;
  profileMarkImageUrl: string | null;
  isMaster: boolean;
};

function toRows(raw: RawRow[]): RankRow[] {
  return raw
    .filter((row) => row.score > 0)
    .map((row, index) => ({
      rank: index + 1,
      nickname: row.nickname,
      level: row.level,
      score: Number(row.score),
      markUrl: displayMarkSrc({
        isMaster: row.isMaster,
        profileMarkImageUrl: row.profileMarkImageUrl,
      }),
    }));
}

/**
 * 레벨 랭킹
 * - 전체: 레벨 높은 순, 같은 레벨이면 누적 경험치 많은 순(점수 = 누적 경험치)
 * - 이번 주·이번 달: 그 기간에 얻은 경험치 순, 같으면 레벨·누적 경험치 순(점수 = 얻은 경험치)
 */
async function levelRows(period: RankPeriod): Promise<RawRow[]> {
  const start = periodStart(period);
  if (start) {
    await ensureExpLedger();
    return prisma.$queryRaw<RawRow[]>`
      SELECT u.nickname, u.level, SUM(x.delta)::int AS score, u."profileMarkImageUrl", u."isMaster"
      FROM "ExpLedger" x
      JOIN "User" u ON u.id = x."userId"
      WHERE x.delta > 0 AND x."createdAt" >= ${start} AND u."withdrawnAt" IS NULL
      GROUP BY u.id
      ORDER BY score DESC, u.level DESC, u.exp DESC, u.nickname ASC
      LIMIT 20
    `;
  }
  return prisma.$queryRaw<RawRow[]>`
    SELECT nickname, level, exp AS score, "profileMarkImageUrl", "isMaster"
    FROM "User"
    WHERE "withdrawnAt" IS NULL AND exp > 0
    ORDER BY level DESC, exp DESC, nickname ASC
    LIMIT 20
  `;
}

async function markRows(period: RankPeriod): Promise<RawRow[]> {
  const start = periodStart(period);
  if (!start) {
    return prisma.$queryRaw<RawRow[]>`
      SELECT u.nickname, u.level, COUNT(*)::int AS score, u."profileMarkImageUrl", u."isMaster"
      FROM "UserMark" um
      JOIN "Mark" m ON m.id = um."markId"
      JOIN "User" u ON u.id = um."userId"
      WHERE m.slug IN (${Prisma.join(YOKAI_SLUGS)}) AND u."withdrawnAt" IS NULL
      GROUP BY u.id
      ORDER BY score DESC, u.level DESC, u.nickname ASC
      LIMIT 20
    `;
  }
  return prisma.$queryRaw<RawRow[]>`
    SELECT u.nickname, u.level, COUNT(*)::int AS score, u."profileMarkImageUrl", u."isMaster"
    FROM "UserMark" um
    JOIN "Mark" m ON m.id = um."markId"
    JOIN "User" u ON u.id = um."userId"
      WHERE m.slug IN (${Prisma.join(YOKAI_SLUGS)})
      AND um."purchasedAt" >= ${start}
      AND u."withdrawnAt" IS NULL
    GROUP BY u.id
    ORDER BY score DESC, u.level DESC, u.nickname ASC
    LIMIT 20
  `;
}

async function attendanceRows(period: RankPeriod): Promise<RawRow[]> {
  const start = periodDate(period);
  if (!start) {
    return prisma.$queryRaw<RawRow[]>`
      SELECT u.nickname, u.level, COUNT(*)::int AS score, u."profileMarkImageUrl", u."isMaster"
      FROM "DailyAttendance" d
      JOIN "User" u ON u.id = d."userId"
      WHERE u."withdrawnAt" IS NULL
      GROUP BY u.id
      ORDER BY score DESC, u.level DESC, u.nickname ASC
      LIMIT 20
    `;
  }
  return prisma.$queryRaw<RawRow[]>`
    SELECT u.nickname, u.level, COUNT(*)::int AS score, u."profileMarkImageUrl", u."isMaster"
    FROM "DailyAttendance" d
    JOIN "User" u ON u.id = d."userId"
    WHERE d.date >= ${start} AND u."withdrawnAt" IS NULL
    GROUP BY u.id
    ORDER BY score DESC, u.level DESC, u.nickname ASC
    LIMIT 20
  `;
}

export async function getRanking(tab: RankTab, period: RankPeriod): Promise<RankRow[]> {
  const raw =
    tab === "marks" ? await markRows(period) : tab === "attendance" ? await attendanceRows(period) : await levelRows(period);
  return toRows(raw);
}

/** 지난주 경험치 1위(같으면 레벨 높은 순 → 누적 경험치 많은 순). 주간 보상 마크를 받습니다. */
export async function weeklyExpWinner(weekStart: string) {
  await ensureExpLedger();
  const start = new Date(`${weekStart}T00:00:00+09:00`);
  const end = new Date(`${shiftDate(weekStart, 7)}T00:00:00+09:00`);
  const rows = await prisma.$queryRaw<
    { id: string; nickname: string; score: number }[]
  >`
    SELECT u.id, u.nickname, SUM(x.delta)::int AS score
    FROM "ExpLedger" x
    JOIN "User" u ON u.id = x."userId"
    WHERE x.delta > 0 AND x."createdAt" >= ${start} AND x."createdAt" < ${end} AND u."withdrawnAt" IS NULL
    GROUP BY u.id
    ORDER BY score DESC, u.level DESC, u.exp DESC, u.nickname ASC
    LIMIT 1
  `;
  const row = rows[0];
  if (!row || row.score <= 0) return null;
  return { id: row.id, nickname: row.nickname, score: Number(row.score) };
}

export function rankScoreLabel(tab: RankTab, score: number, period: RankPeriod = "all") {
  if (tab === "level" && period !== "all") return `+${score.toLocaleString()} EXP`;
  if (tab === "marks") return `${score.toLocaleString()}종`;
  if (tab === "attendance") return `${score.toLocaleString()}일`;
  return `${score.toLocaleString()} EXP`;
}

let crownCache: { at: number; names: string[] } | null = null;

/** 이번 주·이번 달 각 랭킹 1위. 프로필 왕관에 씁니다. */
export async function getCrownNicknames(): Promise<string[]> {
  const now = Date.now();
  if (crownCache && now - crownCache.at < 20_000) return crownCache.names;
  const names = new Set<string>();
  for (const period of ["week", "month"] as const) {
    for (const tab of ["level", "marks", "attendance"] as const) {
      const [first] = await getRanking(tab, period).catch(() => []);
      if (first) names.add(first.nickname);
    }
  }
  const list = [...names];
  crownCache = { at: now, names: list };
  return list;
}
