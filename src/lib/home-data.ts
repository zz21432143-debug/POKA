import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db";
import { ttlCache } from "@/lib/ttl-cache";
import type { PostSummary } from "@/components/posts/post-list";
import type { HomeUrgentJob } from "@/components/home/home-urgent-jobs";
import type { HomeApplyJob } from "@/components/home/home-jobs";
import { toIsoString } from "@/lib/dates";
import { getSponsorCreative } from "@/lib/inventory";
import { getTodayHandSpotlight, getWeeklyHubPost } from "@/lib/growth-ops";
import { getTickerEvents } from "@/lib/ticker";
import { openJobWhere } from "@/lib/job-status";

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
    isPrivate?: boolean;
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
    isPrivate: post.isPrivate,
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
  // 커뮤니티 최신글에는 공고를 넣지 않습니다. 공고는 홈의 급구·최신 공고 박스에서만 봅니다.
  const communityOnly = { boardType: { notIn: ["ANONYMOUS_REVIEW" as const, "JOBS" as const] } };

  // 글 목록 쿼리는 실패를 삼키지 않습니다. 빈 목록이 30초 캐시에 남지 않고, 다음 요청에서 다시 읽습니다.
  const [nativeSponsor, handSpot, hub, allRows, freeRows, jobRows, handRows, urgentRows] =
    await Promise.all([
      getSponsorCreative("NATIVE").catch(() => null),
      getTodayHandSpotlight().catch(() => ({ post: null, isToday: false as const })),
      getWeeklyHubPost().catch(() => null),
      prisma.post
        .findMany({
          where: { ...base, ...communityOnly },
          orderBy: { createdAt: "desc" },
          take: 5,
          include,
        }),
      prisma.post
        .findMany({
          where: { ...base, boardType: "FREE" },
          orderBy: { createdAt: "desc" },
          take: 5,
          include,
        }),
      prisma.post
        .findMany({
          // 홈 메인 공고는 지원 딜러·대회 딜러 구인입니다. 카드에 조건을 보여 주려고 공고 칸을 함께 읽습니다.
          where: {
            AND: [{ ...base, boardType: "JOBS", jobKind: { in: ["APPLY", "TOURNAMENT"] } }, openJobWhere()],
          },
          orderBy: [{ isPaid: "desc" }, { bumpedAt: "desc" }],
          take: 6,
          select: {
            id: true,
            title: true,
            isPaid: true,
            createdAt: true,
            jobLocation: true,
            jobCompanyName: true,
            jobPayAmount: true,
            jobKind: true,
            jobWorkDate: true,
            jobEndDate: true,
            jobEvents: true,
            jobDateFlexible: true,
            jobGuaranteedHours: true,
            jobTravelPay: true,
            jobTravelPayAmount: true,
          },
        }),
      prisma.post
        .findMany({
          where: { ...base, boardType: "HAND_REVIEW" },
          orderBy: { createdAt: "desc" },
          take: 5,
          include,
        }),
      prisma.post
        .findMany({
          where: { AND: [{ ...base, boardType: "JOBS", jobKind: "URGENT" }, openJobWhere()] },
          orderBy: { bumpedAt: "desc" },
          take: 5,
          select: {
            id: true,
            title: true,
            jobLocation: true,
            jobWorkDate: true,
            jobPayAmount: true,
          },
        }),
    ]);

  return {
    all: allRows.map(toSummary),
    free: freeRows.map(toSummary),
    jobs: jobRows.map(
      (row): HomeApplyJob => ({ ...row, createdAt: toIsoString(row.createdAt) }),
    ),
    hands: handRows.map(toSummary),
    urgent: urgentRows as HomeUrgentJob[],
    nativeSponsor,
    hand: handSpot.post
      ? { id: handSpot.post.id, title: handSpot.post.title, isToday: handSpot.isToday }
      : null,
    hub,
  };
}

const cachedHomeFeed = unstable_cache(loadHomeFeed, ["poka-home-feed"], { revalidate: 30 });
const cachedTickerEvents = unstable_cache(getTickerEvents, ["poka-ticker"], { revalidate: 20 });

export function getHomeFeed() {
  return ttlCache("home-feed", 15_000, () => cachedHomeFeed());
}

export function getCachedTickerEvents() {
  return ttlCache("ticker-events", 15_000, () => cachedTickerEvents());
}
