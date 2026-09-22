import { FeaturedPromos } from "@/components/home/featured-promos";
import { HomeShortcuts } from "@/components/home/home-shortcuts";
import { HomeLatest } from "@/components/home/home-latest";
import { AUTHOR_SELECT } from "@/components/posts/author-chip";
import type { PostSummary } from "@/components/posts/post-list";
import { prisma } from "@/lib/db";
import { INFO_PAGES } from "@/lib/info-pages";

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

  const tips = INFO_PAGES.tips.slice(0, 6).map((row) => ({
    title: row.title,
    href: "/info/tips",
    hint: "팁 & 노하우",
  }));

  return (
    <div className="flex flex-col gap-5">
      <FeaturedPromos />
      <HomeShortcuts />
      <HomeLatest all={all} free={free} jobs={jobs} issues={issues} tips={tips} />
    </div>
  );
}
