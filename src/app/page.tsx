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

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ verified?: string }>;
}) {
  const { verified } = await searchParams;
  const include = {
    author: { select: AUTHOR_SELECT },
    _count: { select: { comments: true } },
  } as const;
  const base = { isAttendanceThread: false, hidden: false, boardType: { not: "ANONYMOUS_REVIEW" as const } };

  let all: PostSummary[] = [];
  let free: PostSummary[] = [];
  let jobs: PostSummary[] = [];
  let issues: PostSummary[] = [];
  let urgent: HomeUrgentJob[] = [];
  const today = todayKstDate();
  const notUrgentJob = { NOT: { AND: [{ boardType: "JOBS" as const }, { jobKind: "URGENT" as const }] } };
  const [nativeSponsor, handSpot, hub, dealers, allRows, freeRows, jobRows, issueRows, urgentRows] =
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
  all = allRows.map(toSummary);
  free = freeRows.map(toSummary);
  jobs = jobRows.map(toSummary);
  issues = issueRows.map(toSummary);
  urgent = urgentRows;

  return (
    <div className="flex flex-col gap-5">
      {verified === "1" ? (
        <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-950">
          이메일 인증이 끝났습니다. POKA에 오신 것을 환영합니다.
        </p>
      ) : null}
      <HomeHeroBanner />
      <HomeShortcuts />
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
