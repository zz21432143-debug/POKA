import { prisma } from "@/lib/db";

export type MarkCatalogItem = {
  id: string;
  name: string;
  imageUrl: string;
  pricePoints: number;
  minLevel: number;
  owned: boolean;
  equipped: boolean;
};

export type MarkCatalog = {
  points: number;
  level: number;
  equippedMarkId: string | null;
  marks: MarkCatalogItem[];
};

export async function getMarkCatalog(userId?: string): Promise<MarkCatalog> {
  const [marks, dbUser, owned] = await Promise.all([
    prisma.mark.findMany({ orderBy: { pricePoints: "asc" } }),
    userId ? prisma.user.findUnique({ where: { id: userId } }) : Promise.resolve(null),
    userId ? prisma.userMark.findMany({ where: { userId } }) : Promise.resolve([]),
  ]);
  const ownedIds = new Set(owned.map((row) => row.markId));
  return {
    points: dbUser?.points ?? 0,
    level: dbUser?.level ?? 1,
    equippedMarkId: dbUser?.equippedMarkId ?? null,
    marks: marks.map((mark) => ({
      id: mark.id,
      name: mark.name,
      imageUrl: mark.imageUrl,
      pricePoints: mark.pricePoints,
      minLevel: mark.minLevel,
      owned: ownedIds.has(mark.id),
      equipped: dbUser?.equippedMarkId === mark.id,
    })),
  };
}
