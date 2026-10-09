import { prisma } from "@/lib/db";
import { shiftDate, weekStartKst } from "@/lib/dates";
import { ensureYokaiMarks } from "@/lib/ensure-yokai-marks";
import { weeklyPointsWinner } from "@/lib/ranking";
import { levelRewardSlugs } from "@/lib/yokai-achievements";
import { FOUR_KINGS_MARKS, pickUnusedKingSlug } from "@/lib/yokai-kings";

let weeklyTable: Promise<void> | null = null;

function ensureWeeklyRankReward() {
  weeklyTable ??= prisma
    .$executeRawUnsafe(
      `CREATE TABLE IF NOT EXISTS "WeeklyRankReward" (
        "weekStart" TEXT PRIMARY KEY,
        "userId" TEXT NOT NULL,
        "markSlug" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,
    )
    .then(() => undefined)
    .catch((error) => {
      weeklyTable = null;
      throw error;
    });
  return weeklyTable;
}

export async function grantLevelRewardMarks(userId: string, level: number) {
  const slugs = levelRewardSlugs(level);
  if (slugs.length === 0) return [];
  await ensureYokaiMarks();
  const marks = await prisma.mark.findMany({
    where: { slug: { in: slugs } },
    select: { id: true, slug: true },
  });
  const granted: string[] = [];
  for (const mark of marks) {
    try {
      await prisma.userMark.create({ data: { userId, markId: mark.id } });
      granted.push(mark.slug);
    } catch {
      // already owned
    }
  }
  return granted;
}

export async function awardLastWeekKingMark() {
  await ensureYokaiMarks();
  await ensureWeeklyRankReward();
  const lastWeek = shiftDate(weekStartKst(), -7);
  const existing = await prisma.$queryRaw<{ weekStart: string }[]>`
    SELECT "weekStart" FROM "WeeklyRankReward" WHERE "weekStart" = ${lastWeek} LIMIT 1
  `;
  if (existing.length > 0) return null;
  const winner = await weeklyPointsWinner(lastWeek);
  if (!winner) {
    await prisma.$executeRaw`
      INSERT INTO "WeeklyRankReward" ("weekStart", "userId", "markSlug")
      VALUES (${lastWeek}, ${"none"}, ${"none"})
    `;
    return null;
  }
  const owned = await prisma.userMark.findMany({
    where: { userId: winner.id, mark: { slug: { in: FOUR_KINGS_MARKS.map((row) => row.slug) } } },
    select: { mark: { select: { slug: true } } },
  });
  const slug = pickUnusedKingSlug(owned.map((row) => row.mark.slug));
  if (!slug) {
    await prisma.$executeRaw`
      INSERT INTO "WeeklyRankReward" ("weekStart", "userId", "markSlug")
      VALUES (${lastWeek}, ${winner.id}, ${"full"})
    `;
    return { userId: winner.id, slug: null };
  }
  const mark = await prisma.mark.findUnique({ where: { slug } });
  if (!mark) return null;
  await prisma.userMark.create({ data: { userId: winner.id, markId: mark.id } }).catch(() => undefined);
  await prisma.$executeRaw`
    INSERT INTO "WeeklyRankReward" ("weekStart", "userId", "markSlug")
    VALUES (${lastWeek}, ${winner.id}, ${slug})
  `;
  return { userId: winner.id, slug };
}

export async function syncRewardMarks(userId: string, level: number) {
  await grantLevelRewardMarks(userId, level).catch(() => undefined);
  await awardLastWeekKingMark().catch(() => undefined);
}
