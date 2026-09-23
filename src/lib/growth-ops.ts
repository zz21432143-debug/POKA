import { prisma } from "@/lib/db";
import { todayKstDate, weekStartKst, shiftDate } from "@/lib/dates";
import {
  DEALER_CREW_NICKNAMES,
  WEEKLY_HUB_PREFIX,
  kstDayStart,
  weeklyHubContent,
  weeklyHubTitle,
} from "@/lib/growth";
import { AUTHOR_SELECT } from "@/components/posts/author-chip";

export async function ensureWeeklyScheduleHub() {
  const week = weekStartKst();
  const title = weeklyHubTitle(week);
  const existing = await prisma.post.findFirst({
    where: { boardType: "SCHEDULE", hidden: false, title },
  });
  if (existing) {
    if (existing.content.includes("바카라")) {
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
  const include = { author: { select: AUTHOR_SELECT } } as const;
  const todayHand = await prisma.post.findFirst({
    where: {
      boardType: "HAND_REVIEW",
      hidden: false,
      createdAt: { gte: start },
    },
    orderBy: [{ upvoteCount: "desc" }, { createdAt: "desc" }],
    include,
  });
  if (todayHand) return { post: todayHand, isToday: true as const };
  const latest = await prisma.post.findFirst({
    where: { boardType: "HAND_REVIEW", hidden: false },
    orderBy: { createdAt: "desc" },
    include,
  });
  return { post: latest, isToday: false as const };
}

export async function getWeeklyHubPost() {
  const title = weeklyHubTitle();
  return prisma.post.findFirst({
    where: { boardType: "SCHEDULE", hidden: false, title },
    select: { id: true, title: true, content: true, eventDate: true, eventEndDate: true },
  });
}

export async function getDealerCrew() {
  const weekStart = kstDayStart(weekStartKst());
  const dealers = await prisma.user.findMany({
    where: {
      OR: [{ isDealerVerified: true }, { nickname: { in: [...DEALER_CREW_NICKNAMES] } }],
    },
    orderBy: [{ isDealerVerified: "desc" }, { level: "desc" }],
    take: 10,
    select: {
      id: true,
      nickname: true,
      isDealerVerified: true,
      level: true,
      profileMarkImageUrl: true,
    },
  });
  const ids = dealers.map((row) => row.id);
  const posts =
    ids.length === 0
      ? []
      : await prisma.post.findMany({
          where: {
            authorId: { in: ids },
            hidden: false,
            boardType: { in: ["HAND_REVIEW", "SKETCH"] },
            createdAt: { gte: weekStart },
          },
          select: { authorId: true },
        });
  const countByAuthor = new Map<string, number>();
  for (const post of posts) {
    if (!post.authorId) continue;
    countByAuthor.set(post.authorId, (countByAuthor.get(post.authorId) ?? 0) + 1);
  }
  return dealers.map((dealer) => ({
    ...dealer,
    weeklyOpsPosts: countByAuthor.get(dealer.id) ?? 0,
    weeklyOk: (countByAuthor.get(dealer.id) ?? 0) >= 1,
  }));
}

export async function countWeeklyOpsPosts(userId: string) {
  return prisma.post.count({
    where: {
      authorId: userId,
      hidden: false,
      boardType: { in: ["HAND_REVIEW", "SKETCH"] },
      createdAt: { gte: kstDayStart(weekStartKst()) },
    },
  });
}

export function todayKstLabel() {
  return todayKstDate();
}
