import { PromoBanners } from "@/components/home/promo-banners";
import { HomeShortcuts } from "@/components/home/home-shortcuts";
import { HomeLatest } from "@/components/home/home-latest";
import { GrowthHomePanel } from "@/components/home/growth-home-panel";
import { AUTHOR_SELECT } from "@/components/posts/author-chip";
import type { PostSummary } from "@/components/posts/post-list";
import { prisma } from "@/lib/db";
import { getSponsorCreative } from "@/lib/inventory";
import { todayKstDate } from "@/lib/dates";
import { getTodayHandSpotlight, getWeeklyHubPost } from "@/lib/growth-ops";

export const dynamic = "force-dynamic";

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

export default async function HomePage() {
  const include = {
    author: { select: AUTHOR_SELECT },
    _count: { select: { comments: true } },
  } as const;
  const base = { isAttendanceThread: false, hidden: false };

  let all: PostSummary[] = [];
  let free: PostSummary[] = [];
  let jobs: PostSummary[] = [];
  let issues: PostSummary[] = [];
  const nativeSponsor = await getSponsorCreative("NATIVE").catch(() => null);
  const today = todayKstDate();
  const [handSpot, hub] = await Promise.all([
    getTodayHandSpotlight().catch(() => ({ post: null, isToday: false as const })),
    getWeeklyHubPost().catch(() => null),
  ]);
  try {
    const [allRows, freeRows, jobRows, issueRows] = await Promise.all([
      prisma.post.findMany({
        where: base,
        orderBy: { createdAt: "desc" },
        take: 6,
        include,
      }),
      prisma.post.findMany({
        where: { ...base, boardType: "FREE" },
        orderBy: { createdAt: "desc" },
        take: 6,
        include,
      }),
      prisma.post.findMany({
        where: { ...base, boardType: "JOBS" },
        orderBy: { createdAt: "desc" },
        take: 6,
        include,
      }),
      prisma.post.findMany({
        where: { ...base, boardType: { in: ["ANONYMOUS_REVIEW", "HAND_REVIEW"] } },
        orderBy: { createdAt: "desc" },
        take: 6,
        include,
      }),
    ]);
    all = allRows.map(toSummary);
    free = freeRows.map(toSummary);
    jobs = jobRows.map(toSummary);
    issues = issueRows.map(toSummary);
  } catch {
    all = [];
  }

  return (
    <div className="flex flex-col gap-5">
      <PromoBanners />
      <HomeShortcuts />
      <GrowthHomePanel
        today={today}
        hand={
          handSpot.post
            ? { id: handSpot.post.id, title: handSpot.post.title, isToday: handSpot.isToday }
            : null
        }
        hub={hub}
      />
      <HomeLatest all={all} free={free} jobs={jobs} issues={issues} nativeSponsor={nativeSponsor} />
    </div>
  );
}
