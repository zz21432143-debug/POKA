import { prisma } from "@/lib/db";
import { todayKstDate, weekStartKst, shiftDate } from "@/lib/dates";
import { WEEKLY_HUB_PREFIX, kstDayStart, weeklyHubContent, weeklyHubTitle } from "@/lib/growth";
import { holdemOnlyViolation } from "@/lib/holdem-only";
import { SEED_NICKNAMES } from "@/lib/seed-catalog";

export async function ensureWeeklyScheduleHub() {
  const week = weekStartKst();
  const title = weeklyHubTitle(week);
  const existing = await prisma.post.findFirst({
    where: { boardType: "SCHEDULE", hidden: false, title },
  });
  if (existing) {
    if (holdemOnlyViolation(existing.content)) {
      const weekEnd = shiftDate(week, 6);
      const events = await prisma.post.findMany({
        where: {
          boardType: "SCHEDULE",
          hidden: false,
          eventDate: { gte: week, lte: weekEnd },
          NOT: { title: { startsWith: WEEKLY_HUB_PREFIX } },
        },
        orderBy: { eventDate: "asc" },
        take: 40,
        select: { title: true, eventDate: true, promoLocation: true },
      });
      return prisma.post.update({
        where: { id: existing.id },
        data: { content: weeklyHubContent(events) },
      });
    }
    return existing;
  }

  const weekEnd = shiftDate(week, 6);
  const events = await prisma.post.findMany({
    where: {
      boardType: "SCHEDULE",
      hidden: false,
      eventDate: { gte: week, lte: weekEnd },
      NOT: { title: { startsWith: WEEKLY_HUB_PREFIX } },
    },
    orderBy: { eventDate: "asc" },
    take: 40,
    select: { title: true, eventDate: true, promoLocation: true },
  });

  if (events.length === 0) return null;

  const dealer = await prisma.user.findFirst({
    where: { isAdmin: true },
    select: { id: true },
  });

  try {
    return await prisma.post.create({
      data: {
        boardType: "SCHEDULE",
        title,
        content: weeklyHubContent(events),
        authorId: dealer?.id ?? null,
        eventDate: week,
        eventEndDate: weekEnd,
        promoLocation: "전국 홀덤",
        isPaid: true,
      },
    });
  } catch {
    return prisma.post.findFirst({
      where: { boardType: "SCHEDULE", title },
    });
  }
}

export async function getTodayHandSpotlight() {
  const start = kstDayStart();
  const select = { id: true, title: true } as const;
  const [todayHand, latest] = await Promise.all([
    prisma.post.findFirst({
      where: {
        boardType: "HAND_REVIEW",
        hidden: false,
        createdAt: { gte: start },
      },
      orderBy: [{ upvoteCount: "desc" }, { createdAt: "desc" }],
      select,
    }),
    prisma.post.findFirst({
      where: { boardType: "HAND_REVIEW", hidden: false },
      orderBy: { createdAt: "desc" },
      select,
    }),
  ]);
  if (todayHand) return { post: todayHand, isToday: true as const };
  return { post: latest, isToday: false as const };
}

export async function getWeeklyHubPost() {
  const title = weeklyHubTitle();
  return prisma.post.findFirst({
    where: { boardType: "SCHEDULE", hidden: false, title },
    select: { id: true, title: true, content: true, eventDate: true, eventEndDate: true },
  });
}

export async function getVerifiedDealers() {
  const dealers = await prisma.user.findMany({
    where: {
      isDealerVerified: true,
      isMaster: false,
      isAdmin: false,
      nickname: { notIn: [...SEED_NICKNAMES] },
    },
    orderBy: [{ level: "desc" }, { nickname: "asc" }],
    take: 12,
    select: {
      id: true,
      nickname: true,
      level: true,
      profileMarkImageUrl: true,
    },
  });
  const ids = dealers.map((row) => row.id);
  const hands =
    ids.length === 0
      ? []
      : await prisma.post.findMany({
          where: {
            authorId: { in: ids },
            hidden: false,
            boardType: "HAND_REVIEW",
          },
          orderBy: { createdAt: "desc" },
          select: { id: true, title: true, authorId: true, upvoteCount: true },
        });
  const latestByAuthor = new Map<string, (typeof hands)[number]>();
  for (const hand of hands) {
    if (!hand.authorId || latestByAuthor.has(hand.authorId)) continue;
    latestByAuthor.set(hand.authorId, hand);
  }
  return dealers.map((dealer) => ({
    ...dealer,
    latestHand: latestByAuthor.get(dealer.id) ?? null,
  }));
}

export function todayKstLabel() {
  return todayKstDate();
}
