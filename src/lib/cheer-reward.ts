import { prisma } from "@/lib/db";
import { todayKstDate } from "@/lib/dates";

/** 관전석 응원 보상(오목 · 윷 합쳐 하루 한 번) */
export const CHEER_EXP = 5;

export async function rewardCheer(userId: string) {
  const day = todayKstDate();
  const made = await prisma.toolSaved
    .createMany({ data: [{ id: `cheerexp_${userId}_${day}`, ownerId: userId, kind: "cheer-exp", name: day, dataJson: "{}" }], skipDuplicates: true })
    .catch(() => ({ count: 0 }));
  if (made.count !== 1) return false;
  const { grantRewards } = await import("@/lib/exp");
  await grantRewards(userId, CHEER_EXP, 0).catch(() => undefined);
  return true;
}
