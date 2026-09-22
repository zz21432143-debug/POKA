import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";
import { FEATURED_OFFICIAL_POSTERS, OFFICIAL_POSTER_IMAGES } from "../src/lib/official-posters";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./prisma/dev.db",
});
const prisma = new PrismaClient({ adapter });

async function main() {
  const dealer =
    (await prisma.user.findUnique({ where: { nickname: "펠트딜러" } })) ??
    (await prisma.user.findFirst({ where: { isDealerVerified: true } }));
  if (!dealer) throw new Error("시드 회원이 없습니다. prisma db seed 를 먼저 실행하세요.");

  const ids: string[] = [];
  for (const [index, poster] of FEATURED_OFFICIAL_POSTERS.entries()) {
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

  await prisma.bannerSlot.deleteMany();
  await prisma.bannerSlot.createMany({
    data: ids.map((postId, index) => ({
      slot: index + 1,
      mode: "MANUAL",
      enabled: true,
      postId,
    })),
  });

  const rest = await prisma.post.findMany({
    where: { boardType: "PROMO", id: { notIn: ids } },
    orderBy: { createdAt: "desc" },
  });
  for (const [index, post] of rest.entries()) {
    await prisma.post.update({
      where: { id: post.id },
      data: {
        bannerImageUrl: OFFICIAL_POSTER_IMAGES[index % OFFICIAL_POSTER_IMAGES.length],
        storeVerified: true,
        hidden: false,
      },
    });
  }

  console.log(`Official posters ready: ${ids.length} featured, ${rest.length} extra`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
