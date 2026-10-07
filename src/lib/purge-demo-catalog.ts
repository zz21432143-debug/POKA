import { SEED_NICKNAMES } from "@/lib/seed-catalog";
import { FEATURED_OFFICIAL_POSTERS } from "@/lib/official-posters";

export const PURGE_SEED_CATALOG_KIND = "PURGE_SEED_CATALOG";

const SEED_NICK_SET = new Set<string>(SEED_NICKNAMES);
const DUMMY_POSTER_TITLES = new Set(FEATURED_OFFICIAL_POSTERS.map((row) => row.title));

export function isSeedCatalogNickname(nickname: string) {
  return SEED_NICK_SET.has(nickname);
}

export function isDummyOfficialPosterTitle(title: string) {
  return DUMMY_POSTER_TITLES.has(title);
}

export function tickerMentionsSeedCatalog(message: string) {
  return [...SEED_NICKNAMES].some((nickname) => message.includes(`${nickname}님`));
}

export async function purgeDemoCatalog() {
  const { createPrismaClient } = await import("@/lib/create-prisma-client");
  const prisma = createPrismaClient();
  try {
    await prisma.tickerEvent.deleteMany({
      where: {
        OR: [...SEED_NICKNAMES].map((nickname) => ({
          message: { contains: `${nickname}님` },
        })),
      },
    });

    const already = await prisma.auditLog.findFirst({
      where: { kind: PURGE_SEED_CATALOG_KIND },
      select: { id: true },
    });
    if (already) return;

    const seedUsers = await prisma.user.findMany({
      where: { nickname: { in: [...SEED_NICKNAMES] } },
      select: { id: true },
    });
    const seedIds = seedUsers.map((row) => row.id);

    if (seedIds.length) {
      await prisma.bannerSlot.updateMany({
        where: { post: { authorId: { in: seedIds } } },
        data: { postId: null },
      });
      await prisma.dailyAttendance.deleteMany({ where: { userId: { in: seedIds } } });
      await prisma.comment.deleteMany({ where: { authorId: { in: seedIds } } });
      await prisma.post.deleteMany({
        where: { authorId: { in: seedIds }, isAttendanceThread: false },
      });
      await prisma.user.updateMany({
        where: { id: { in: seedIds } },
        data: { attendanceStreak: 0, lastAttendanceDate: null },
      });
    }

    const dummyPosters = await prisma.post.findMany({
      where: { title: { in: [...DUMMY_POSTER_TITLES] } },
      select: { id: true },
    });
    const dummyIds = dummyPosters.map((row) => row.id);
    if (dummyIds.length) {
      await prisma.bannerSlot.updateMany({
        where: { postId: { in: dummyIds } },
        data: { postId: null },
      });
      await prisma.post.deleteMany({ where: { id: { in: dummyIds } } });
    }

    await prisma.auditLog.create({
      data: {
        kind: PURGE_SEED_CATALOG_KIND,
        ip: "system",
        detail: `seed nicks ${seedIds.length}, dummy posters ${dummyIds.length}`,
      },
    });
    console.log("ensure-db: purged seed catalog posts");
  } finally {
    await prisma.$disconnect();
  }
}
