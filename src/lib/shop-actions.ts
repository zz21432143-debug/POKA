import { prisma } from "@/lib/db";

export async function buyCosmetic(userId: string, cosmeticId: string) {
  const cosmetic = await prisma.profileCosmetic.findUnique({ where: { id: cosmeticId } });
  if (!cosmetic) return { error: "상품을 찾을 수 없습니다.", status: 404 as const };
  const owned = await prisma.userCosmetic.findUnique({
    where: { userId_cosmeticId: { userId, cosmeticId } },
  });
  if (owned) return { error: "이미 보유한 상품입니다.", status: 409 as const };
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { error: "로그인된 회원이 없습니다.", status: 401 as const };
  if (user.level < cosmetic.minLevel) {
    return { error: `Lv.${cosmetic.minLevel}부터 구매할 수 있습니다.`, status: 400 as const };
  }
  if (user.points < cosmetic.pricePoints) {
    return { error: "포인트가 부족합니다.", status: 400 as const };
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { points: { decrement: cosmetic.pricePoints } },
    }),
    prisma.userCosmetic.create({ data: { userId, cosmeticId } }),
  ]);

  const { pushTicker } = await import("@/lib/ticker");
  await pushTicker({
    kind: `COSMETIC:${userId}:${cosmetic.id}`,
    message: `✨ ${user.nickname}님이 상점에서 [${cosmetic.name}]를 구매하셨습니다!`,
    href: "/shop",
  });

  return { ok: true as const, spent: cosmetic.pricePoints, kind: cosmetic.kind };
}

export async function equipCosmetic(userId: string, cosmeticId: string) {
  const owned = await prisma.userCosmetic.findUnique({
    where: { userId_cosmeticId: { userId, cosmeticId } },
    include: { cosmetic: true },
  });
  if (!owned) return { error: "보유하지 않은 상품입니다. 먼저 구매하세요.", status: 400 as const };

  if (owned.cosmetic.kind === "FRAME") {
    await prisma.user.update({
      where: { id: userId },
      data: { equippedFrameId: owned.cosmeticId },
    });
  } else {
    await prisma.user.update({
      where: { id: userId },
      data: { equippedEffectId: owned.cosmeticId },
    });
  }

  return { ok: true as const, kind: owned.cosmetic.kind };
}
