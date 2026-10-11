import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { PostList, type PostSummary } from "@/components/posts/post-list";
import { JobCards, type JobCardData } from "@/components/jobs/job-cards";
import { AUTHOR_SELECT } from "@/components/posts/author-chip";
import { toJobCard } from "@/lib/load-feed";
import { cn } from "cn";

export const metadata: Metadata = { title: "검색", robots: { index: false } };

export const dynamic = "force-dynamic";

const SCOPES = [
  { key: "all", label: "전체" },
  { key: "jobs", label: "구인공고" },
  { key: "posts", label: "일반글" },
] as const;

type Scope = (typeof SCOPES)[number]["key"];

function searchHref(query: string, scope: Scope) {
  const params = new URLSearchParams({ q: query });
  if (scope !== "all") params.set("scope", scope);
  return `/search?${params.toString()}`;
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; scope?: string }>;
}) {
  const { q = "", scope: rawScope } = await searchParams;
  const query = q.trim();
  const scope: Scope = SCOPES.some((row) => row.key === rawScope) ? (rawScope as Scope) : "all";

  let jobs: JobCardData[] = [];
  let posts: PostSummary[] = [];
  let jobTotal = 0;
  let postTotal = 0;
  if (query) {
    const base = {
      hidden: false,
      isAttendanceThread: false,
      boardType: { not: "ANONYMOUS_REVIEW" as const },
      OR: [
        { title: { contains: query } },
        { jobLocation: { contains: query } },
        { AND: [{ isPrivate: false }, { content: { contains: query } }] },
      ],
    };
    const jobWhere = {
      AND: [base, { boardType: "JOBS" as const, OR: [{ jobKind: null }, { jobKind: { not: "SEEKING" as const } }] }],
    };
    const postWhere = { AND: [base, { boardType: { not: "JOBS" as const } }] };
    const include = { author: { select: AUTHOR_SELECT }, _count: { select: { comments: true } } } as const;
    const [jobRows, postRows, jobCount, postCount] = await Promise.all([
      scope === "posts"
        ? Promise.resolve([])
        : prisma.post.findMany({ where: jobWhere, orderBy: { createdAt: "desc" }, take: scope === "jobs" ? 30 : 10, include }),
      scope === "jobs"
        ? Promise.resolve([])
        : prisma.post.findMany({ where: postWhere, orderBy: { createdAt: "desc" }, take: scope === "posts" ? 30 : 10, include }),
      prisma.post.count({ where: jobWhere }),
      prisma.post.count({ where: postWhere }),
    ]);
    jobTotal = jobCount;
    postTotal = postCount;
    jobs = jobRows.map((row) => toJobCard(row));
    posts = postRows.map((post) => ({
      id: post.id,
      boardType: post.boardType,
      title: post.title,
      author: post.author,
      upvoteCount: post.upvoteCount,
      createdAt: post.createdAt.toISOString(),
      viewCount: post.viewCount,
      commentCount: post._count.comments,
      isPrivate: post.isPrivate,
    }));
  }

  return (
    <div className="flex flex-col gap-4">
      <header className="board-intro">
        <h1>검색</h1>
        <form action="/search" className="mt-3">
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder="지역, 매장, 제목으로 검색하세요."
            className="ink-field h-11 w-full rounded-full px-4 text-sm outline-none focus:border-[#C59B27] focus:ring-2 focus:ring-[#C59B27]/30"
          />
          {scope !== "all" ? <input type="hidden" name="scope" value={scope} /> : null}
        </form>
      </header>
      {query ? (
        <>
          <nav aria-label="검색 범위" className="flex gap-1.5">
            {SCOPES.map((row) => {
              const count = row.key === "jobs" ? jobTotal : row.key === "posts" ? postTotal : jobTotal + postTotal;
              return (
                <Link
                  key={row.key}
                  href={searchHref(query, row.key)}
                  aria-current={scope === row.key ? "page" : undefined}
                  className={cn(
                    "touch-target inline-flex min-h-9 items-center gap-1 rounded-full border px-3.5 text-[13px] font-semibold",
                    scope === row.key
                      ? "border-[#c9a25c] bg-[#c9a25c] text-[#1d1611]"
                      : "border-white/15 text-[#E5E7EB] hover:border-[#c9a25c]/60",
                  )}
                >
                  {row.label}
                  <span className="text-xs opacity-75">{count}</span>
                </Link>
              );
            })}
          </nav>
          {scope !== "posts" ? (
            <section className="flex flex-col gap-2">
              {scope === "all" ? (
                <SectionHead title="구인공고" total={jobTotal} more={jobTotal > jobs.length ? searchHref(query, "jobs") : null} />
              ) : null}
              <JobCards jobs={jobs} emptyText={`‘${query}’ 구인공고가 없습니다.`} />
            </section>
          ) : null}
          {scope !== "jobs" ? (
            <section className="flex flex-col gap-2">
              {scope === "all" ? (
                <SectionHead title="일반글" total={postTotal} more={postTotal > posts.length ? searchHref(query, "posts") : null} />
              ) : null}
              <PostList posts={posts} emptyText={`‘${query}’ 일반글이 없습니다.`} showBoard />
            </section>
          ) : null}
        </>
      ) : (
        <p className="ink-panel rounded-2xl px-4 py-10 text-center text-sm text-[#D1D5DB]">
          제목, 본문, 근무지로 글을 찾아보세요.{" "}
          <Link href="/boards/jobs" className="text-primary">
            구인구직 보기
          </Link>
        </p>
      )}
    </div>
  );
}

function SectionHead({ title, total, more }: { title: string; total: number; more: string | null }) {
  return (
    <div className="flex items-center gap-2">
      <h2 className="text-lg font-bold text-white">
        {title} <span className="text-sm font-semibold text-[#9CA3AF]">{total}</span>
      </h2>
      {more ? (
        <Link href={more} className="more-link ml-auto">
          {title} 더보기
        </Link>
      ) : null}
    </div>
  );
}
