import { prisma } from "@/lib/db";
import { YOKAI_ACHIEVEMENTS } from "@/lib/yokai-achievements";
import { YOKAI_MARKS } from "@/lib/yokai-marks";

let ensured: Promise<void> | null = null;

export function ensureYokaiMarks() {
  if (!ensured) {
    ensured = writeYokaiMarks().catch((error) => {
      ensured = null;
      throw error;
    });
  }
  return ensured;
}

async function writeYokaiMarks() {
  const found = await prisma.mark.findMany({
    where: { slug: { in: [...YOKAI_MARKS, ...YOKAI_ACHIEVEMENTS].map((mark) => mark.slug) } },
    select: { slug: true, name: true, imageUrl: true, pricePoints: true },
  });
  const bySlug = new Map(found.map((mark) => [mark.slug, mark]));
  const rows = [
    ...YOKAI_MARKS,
    ...YOKAI_ACHIEVEMENTS.map((mark) => ({
      slug: mark.slug,
      name: mark.name,
      imageUrl: mark.imageUrl,
      pricePoints: 0,
    })),
  ];
  for (const row of rows) {
    const current = bySlug.get(row.slug);
    if (!current) {
      await prisma.mark.create({
        data: {
          slug: row.slug,
          name: row.name,
          imageUrl: row.imageUrl,
          pricePoints: row.pricePoints,
          minLevel: 1,
          category: "SPECIAL",
        },
      });
      continue;
    }
    if (
      current.name !== row.name ||
      current.imageUrl !== row.imageUrl ||
      current.pricePoints !== row.pricePoints
    ) {
      await prisma.mark.update({
        where: { slug: row.slug },
        data: { name: row.name, imageUrl: row.imageUrl, pricePoints: row.pricePoints },
      });
    }
  }
}
