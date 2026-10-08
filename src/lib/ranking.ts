import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { todayKstDate, weekStartKst } from "@/lib/dates";
import { displayMarkSrc } from "@/lib/mark-assets";
import { ensurePointLedger } from "@/lib/point-ledger";
import { YOKAI_MARKS } from "@/lib/yokai-marks";

export type RankTab = "points" | "marks" | "attendance";
export type RankPeriod = "all" | "week" | "month";

export type RankRow = {
  rank: number;
  nickname: string;
  level: number;
  score: number;
  markUrl: string;
};

const YOKAI_SLUGS = YOKAI_MARKS.map((mark) => mark.slug);

export function parseRankTab(value: string | undefined): RankTab {
  if (value === "marks" || value === "attendance") return value;
  return "points";
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

async function pointRows(period: RankPeriod): Promise<RawRow[]> {
  if (period === "all") {
    return prisma.$queryRaw<RawRow[]>`
      SELECT nickname, level, points AS score, "profileMarkImageUrl", "isMaster"
      FROM "User"
      WHERE "withdrawnAt" IS NULL AND points > 0
      ORDER BY points DESC, level DESC, nickname ASC
      LIMIT 20
    `;
  }
  await ensurePointLedger();
  const start = periodStart(period)!;
  return prisma.$queryRaw<RawRow[]>`
    SELECT u.nickname, u.level, SUM(p.delta)::int AS score, u."profileMarkImageUrl", u."isMaster"
    FROM "PointLedger" p
    JOIN "User" u ON u.id = p."userId"
    WHERE p.delta > 0 AND p."createdAt" >= ${start} AND u."withdrawnAt" IS NULL
    GROUP BY u.id
    ORDER BY score DESC, u.level DESC, u.nickname ASC
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
    tab === "marks" ? await markRows(period) : tab === "attendance" ? await attendanceRows(period) : await pointRows(period);
  return toRows(raw);
}

export function rankScoreLabel(tab: RankTab, score: number) {
  if (tab === "marks") return `${score.toLocaleString()}종`;
  if (tab === "attendance") return `${score.toLocaleString()}일`;
  return `${score.toLocaleString()} P`;
}

let crownCache: { at: number; names: string[] } | null = null;

/** 이번 주·이번 달 각 랭킹 1위. 프로필 왕관에 씁니다. */
export async function getCrownNicknames(): Promise<string[]> {
  const now = Date.now();
  if (crownCache && now - crownCache.at < 20_000) return crownCache.names;
  const names = new Set<string>();
  for (const period of ["week", "month"] as const) {
    for (const tab of ["points", "marks", "attendance"] as const) {
      const [first] = await getRanking(tab, period).catch(() => []);
      if (first) names.add(first.nickname);
    }
  }
  const list = [...names];
  crownCache = { at: now, names: list };
  return list;
}
