import { prisma } from "@/lib/db";
import {
  type CosmeticCatalogItem,
  type MarkCatalog,
  type MarkCategoryId,
} from "@/lib/mark-categories";

export type { CosmeticCatalogItem, MarkCatalog, MarkCatalogItem, MarkCategoryId, ShopKindId } from "@/lib/mark-categories";
export { MARK_CATEGORIES, SHOP_KINDS, marksInCategory } from "@/lib/mark-categories";

function toCosmeticItem(
  row: {
    id: string;
    slug: string;
    name: string;
    kind: "FRAME" | "EFFECT";
    imageUrl: string | null;
    cssClass: string | null;
    pricePoints: number;
    minLevel: number;
  },
  ownedIds: Set<string>,
  equippedId: string | null | undefined,
): CosmeticCatalogItem {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    kind: row.kind,
    imageUrl: row.imageUrl,
    cssClass: row.cssClass,
    pricePoints: row.pricePoints,
    minLevel: row.minLevel,
    owned: ownedIds.has(row.id),
    equipped: equippedId === row.id,
  };
}

export async function getMarkCatalog(userId?: string): Promise<MarkCatalog> {
  const [marks, cosmetics, dbUser, owned, ownedCosmetics] = await Promise.all([
    prisma.mark.findMany({ orderBy: [{ category: "asc" }, { pricePoints: "asc" }, { name: "asc" }] }),
    prisma.profileCosmetic.findMany({ orderBy: [{ kind: "asc" }, { pricePoints: "asc" }, { name: "asc" }] }),
    userId ? prisma.user.findUnique({ where: { id: userId } }) : Promise.resolve(null),
    userId ? prisma.userMark.findMany({ where: { userId } }) : Promise.resolve([]),
    userId ? prisma.userCosmetic.findMany({ where: { userId } }) : Promise.resolve([]),
  ]);
  const ownedIds = new Set(owned.map((row) => row.markId));
  const ownedCosmeticIds = new Set(ownedCosmetics.map((row) => row.cosmeticId));
  return {
    points: dbUser?.points ?? 0,
    level: dbUser?.level ?? 1,
    isMaster: dbUser?.isMaster ?? false,
    isAdmin: dbUser?.isAdmin ?? false,
    equippedMarkId: dbUser?.equippedMarkId ?? null,
    equippedFrameId: dbUser?.equippedFrameId ?? null,
    equippedEffectId: dbUser?.equippedEffectId ?? null,
    marks: marks.map((mark) => ({
      id: mark.id,
      slug: mark.slug,
      name: mark.name,
      imageUrl: mark.imageUrl,
      pricePoints: mark.pricePoints,
      minLevel: mark.minLevel,
      category: mark.category as MarkCategoryId,
      owned: ownedIds.has(mark.id),
      equipped: dbUser?.equippedMarkId === mark.id,
    })),
    frames: cosmetics
      .filter((row) => row.kind === "FRAME")
      .map((row) => toCosmeticItem(row, ownedCosmeticIds, dbUser?.equippedFrameId)),
    effects: cosmetics
      .filter((row) => row.kind === "EFFECT")
      .map((row) => toCosmeticItem(row, ownedCosmeticIds, dbUser?.equippedEffectId)),
  };
}
