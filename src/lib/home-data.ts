import { prisma } from "@/lib/db";
import { ttlCache } from "@/lib/ttl-cache";
import type { PostSummary } from "@/components/posts/post-list";
import type { HomeUrgentJob } from "@/components/home/home-urgent-jobs";
import { getSponsorCreative } from "@/lib/inventory";
import { getTodayHandSpotlight, getWeeklyHubPost, getVerifiedDealers } from "@/lib/growth-ops";
import { getTickerEvents } from "@/lib/ticker";

const HOME_AUTHOR_SELECT = {
  nickname: true,
  profileMarkImageUrl: true,
  level: true,
  isDealerVerified: true,
  isAdmin: true,
  isMaster: true,
  attendanceStreak: true,
} as const;

function toSummary(
  post: {
    id: string;
    boardType: string;
    title: string;
    author: PostSummary["author"];
    upvoteCount: number;
    createdAt: Date;
    viewCount: number;
    ratingManner: number | null;
    ratingService: number | null;
    ratingFacility: number | null;
    ratingAtmosphere: number | null;
    _count: { comments: number };
  },
): PostSummary {
  return {
    id: post.id,
    boardType: post.boardType,
    title: post.title,
    author: post.author,
    upvoteCount: post.upvoteCount,
    createdAt: post.createdAt.toISOString(),
    viewCount: post.viewCount,
    commentCount: post._count.comments,
    ratingManner: post.ratingManner,
    ratingService: post.ratingService,
    ratingFacility: post.ratingFacility,
    ratingAtmosphere: post.ratingAtmosphere,
  };
}

async function loadHomeFeed() {
  const include = {
    author: { select: HOME_AUTHOR_SELECT },
    _count: { select: { comments: true } },
  } as const;
  const base = { isAttendanceThread: false, hidden: false, boardType: { not: "ANONYMOUS_REVIEW" as const } };
  const notUrgentJob = { NOT: { AND: [{ boardType: "JOBS" as const }, { jobKind: "URGENT" as const }] } };

  const [nativeSponsor, handSpot, hub, dealers, allRows, freeRows, jobRows, handRows, urgentRows] =
    await Promise.all([
      getSponsorCreative("NATIVE").catch(() => null),
      getTodayHandSpotlight().catch(() => ({ post: null, isToday: false as const })),
      getWeeklyHubPost().catch(() => null),
      getVerifiedDealers().catch(() => []),
      prisma.post
        .findMany({
          where: { ...base, ...notUrgentJob },
          orderBy: { createdAt: "desc" },
          take: 6,
          include,
        })
        .catch(() => []),
      prisma.post
        .findMany({
          where: { ...base, boardType: "FREE" },
          orderBy: { createdAt: "desc" },
          take: 6,
          include,
        })
        .catch(() => []),
      prisma.post
        .findMany({
          where: { ...base, boardType: "JOBS", jobKind: { not: "URGENT" } },
          orderBy: { createdAt: "desc" },
          take: 6,
          include,
        })
        .catch(() => []),
      prisma.post
        .findMany({
          where: { ...base, boardType: "HAND_REVIEW" },
          orderBy: { createdAt: "desc" },
          take: 6,
          include,
        })
        .catch(() => []),
      prisma.post
        .findMany({
          where: { ...base, boardType: "JOBS", jobKind: "URGENT" },
          orderBy: { createdAt: "desc" },
          take: 5,
          select: {
            id: true,
            title: true,
            jobLocation: true,
            jobWorkDate: true,
            jobPayAmount: true,
          },
        })
        .catch(() => []),
    ]);

  return {
    all: allRows.map(toSummary),
    free: freeRows.map(toSummary),
    jobs: jobRows.map(toSummary),
    hands: handRows.map(toSummary),
    urgent: urgentRows as HomeUrgentJob[],
    nativeSponsor,
    hand: handSpot.post
      ? { id: handSpot.post.id, title: handSpot.post.title, isToday: handSpot.isToday }
      : null,
    hub,
    dealers,
  };
}

export function getHomeFeed() {
  return ttlCache("home-feed", 20_000, loadHomeFeed);
}

export function getCachedTickerEvents() {
  return ttlCache("ticker-events", 20_000, getTickerEvents);
}
