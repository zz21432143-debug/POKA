import { prisma } from "@/lib/db";
import { VILLAGE_ALL_MARKS, VILLAGE_CHIEF_MARK, VILLAGE_COLLECTION_STEPS } from "@/lib/yokai-marks";

/**
 * 요괴 마을 도감: 마크를 살 때마다 모은 수를 세어 단계 보상(단계마다 한 번).
 * 마지막 단계는 비매품 「요괴 마을 촌장」 마크도 줌.
 */
export async function checkVillageCollection(userId: string) {
  const owned = await prisma.userMark.count({
    where: { userId, mark: { slug: { in: VILLAGE_ALL_MARKS.map((m) => m.slug) } } },
  });
  const got: { at: number; points: number; mark: boolean }[] = [];
  for (const step of VILLAGE_COLLECTION_STEPS) {
    if (owned < step.at) continue;
    const made = await prisma.toolSaved
      .createMany({ data: [{ id: `villagecol_${userId}_${step.at}`, ownerId: userId, kind: "village-collection", name: String(step.at), dataJson: "{}" }], skipDuplicates: true })
      .catch(() => ({ count: 0 }));
    if (made.count !== 1) continue;
    const { grantRewards } = await import("@/lib/exp");
    await grantRewards(userId, 0, step.points, { ignorePointCap: true }).catch(() => undefined);
    const withMark = "mark" in step && step.mark;
    if (withMark) {
      const chief = await prisma.mark.findUnique({ where: { slug: VILLAGE_CHIEF_MARK.slug }, select: { id: true } });
      if (chief) await prisma.userMark.createMany({ data: [{ userId, markId: chief.id }], skipDuplicates: true }).catch(() => undefined);
    }
    got.push({ at: step.at, points: step.points, mark: Boolean(withMark) });
  }
  if (got.length) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { nickname: true } });
    const top = got[got.length - 1];
    const { pushTicker } = await import("@/lib/ticker");
    await pushTicker({
      kind: `VILLAGECOL:${userId}:${top.at}`,
      message: top.mark
        ? `👑 ${user?.nickname ?? "회원"}님이 요괴 마을 마크 ${top.at}종을 모두 모아 「요괴 마을 촌장」이 됐어요!`
        : `📖 ${user?.nickname ?? "회원"}님이 요괴 마을 도감 ${top.at}종 달성!`,
      href: "/shop",
    }).catch(() => undefined);
  }
  return { owned, got };
}
