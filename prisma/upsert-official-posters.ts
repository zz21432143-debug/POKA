import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";
import { FEATURED_OFFICIAL_POSTERS } from "../src/lib/official-posters";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./prisma/dev.db",
});
const prisma = new PrismaClient({ adapter });

const TEAM_NAMES = [
  { slug: "team-a", name: "TOP" },
  { slug: "team-b", name: "PLIME" },
  { slug: "team-c", name: "HAM" },
  { slug: "team-d", name: "ROCKET" },
  { slug: "team-e", name: "GUNNER" },
  { slug: "team-f", name: "DOO" },
] as const;

async function main() {
  const dealer =
    (await prisma.user.findUnique({ where: { nickname: "펠트딜러" } })) ??
    (await prisma.user.findFirst({ where: { isDealerVerified: true } }));
  if (!dealer) throw new Error("시드 회원이 없습니다. prisma db seed 를 먼저 실행하세요.");

  const visible = [...FEATURED_OFFICIAL_POSTERS];
  const ids: string[] = [];
  for (const [index, poster] of visible.entries()) {
    const existing = await prisma.post.findFirst({
      where: { boardType: "PROMO", title: poster.title },
    });
    const data = {
      boardType: "PROMO" as const,
      authorId: dealer.id,
      title: poster.title,
      content: poster.content,
      bannerImageUrl: poster.image,
      promoLocation: poster.location,
      promoTag: poster.tag,
      storeVerified: true,
      hidden: false,
      isPaid: poster.isPaid,
      createdAt: new Date(Date.now() - index * 60_000),
    };
    const post = existing
      ? await prisma.post.update({ where: { id: existing.id }, data })
      : await prisma.post.create({ data });
    ids.push(post.id);
  }

  const publicTitles = FEATURED_OFFICIAL_POSTERS.map((row) => row.title);
  await prisma.post.updateMany({
    where: { boardType: "PROMO", title: { notIn: [...publicTitles] } },
    data: { hidden: true },
  });

  await prisma.bannerSlot.deleteMany();
  await prisma.bannerSlot.createMany({
    data: [1, 2, 3, 4, 5, 6].map((slot) => ({
      slot,
      mode: "MANUAL",
      enabled: true,
      postId: ids[slot - 1] ?? null,
    })),
  });

  for (const row of TEAM_NAMES) {
    await prisma.mark.updateMany({ where: { slug: row.slug }, data: { name: row.name } });
  }

  console.log(`Visible official posters: ${ids.length}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
