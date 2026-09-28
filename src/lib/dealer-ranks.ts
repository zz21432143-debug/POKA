import { prisma } from "@/lib/db";

export const DRILL_KINDS = {
  SIDE_POT: "사이드팟 계산",
  MIN_RAISE: "미니멈 레이즈",
} as const;

export type DrillKind = keyof typeof DRILL_KINDS;

export async function listDrillRanks(kind: DrillKind, take = 20) {
  const rows = await prisma.dealerDrillRun.findMany({
    where: { kind, total: 10 },
    orderBy: [{ correct: "desc" }, { durationMs: "asc" }, { createdAt: "asc" }],
    include: { user: { select: { nickname: true, isDealerVerified: true } } },
    take: 80,
  });
  const seen = new Set<string>();
  const unique = [];
  for (const row of rows) {
    if (seen.has(row.userId)) continue;
    seen.add(row.userId);
    unique.push(row);
    if (unique.length >= take) break;
  }
  return unique;
}

export async function listMyDrillRuns(userId: string, kind?: DrillKind) {
  return prisma.dealerDrillRun.findMany({
    where: { userId, ...(kind ? { kind } : {}) },
    orderBy: { createdAt: "desc" },
    take: 8,
  });
}
