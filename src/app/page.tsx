import { PromoBanners } from "@/components/home/promo-banners";
import { HomeShortcuts } from "@/components/home/home-shortcuts";
import { HomeHeroBanner } from "@/components/home/home-hero-banner";
import { HomeLatest } from "@/components/home/home-latest";
import { HomeUrgentJobs, type HomeUrgentJob } from "@/components/home/home-urgent-jobs";
import { GrowthHomePanel } from "@/components/home/growth-home-panel";
import { AUTHOR_SELECT } from "@/components/posts/author-chip";
import type { PostSummary } from "@/components/posts/post-list";
import { prisma } from "@/lib/db";
import { getSponsorCreative } from "@/lib/inventory";
import { todayKstDate } from "@/lib/dates";
import { getTodayHandSpotlight, getWeeklyHubPost, getVerifiedDealers } from "@/lib/growth-ops";
import { VerifiedDealerStrip } from "@/components/home/verified-dealer-strip";

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
  let urgent: HomeUrgentJob[] = [];
  const nativeSponsor = await getSponsorCreative("NATIVE").catch(() => null);
  const today = todayKstDate();
  const [handSpot, hub, dealers] = await Promise.all([
    getTodayHandSpotlight().catch(() => ({ post: null, isToday: false as const })),
    getWeeklyHubPost().catch(() => null),
    getVerifiedDealers().catch(() => []),
  ]);
  try {
    const notUrgentJob = { NOT: { AND: [{ boardType: "JOBS" as const }, { jobKind: "URGENT" as const }] } };
    const [allRows, freeRows, jobRows, issueRows, urgentRows] = await Promise.all([
      prisma.post.findMany({
        where: { ...base, ...notUrgentJob },
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
        where: { ...base, boardType: "JOBS", jobKind: { not: "URGENT" } },
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
      prisma.post.findMany({
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
      }),
    ]);
    all = allRows.map(toSummary);
    free = freeRows.map(toSummary);
    jobs = jobRows.map(toSummary);
    issues = issueRows.map(toSummary);
    urgent = urgentRows;
  } catch {
    all = [];
  }

  return (
    <div className="flex flex-col gap-5">
      <HomeHeroBanner />
      <HomeLatest all={all} free={free} jobs={jobs} issues={issues} nativeSponsor={nativeSponsor} />
      <HomeUrgentJobs
        jobs={urgent.map((row) => ({
          id: row.id,
          title: row.title,
          jobLocation: row.jobLocation,
          jobWorkDate: row.jobWorkDate,
          jobPayAmount: row.jobPayAmount,
        }))}
      />
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
      <VerifiedDealerStrip dealers={dealers} />
      <PromoBanners />
    </div>
  );
}
