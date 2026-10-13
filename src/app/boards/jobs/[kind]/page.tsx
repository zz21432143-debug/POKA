import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { InfiniteJobList } from "@/components/jobs/infinite-job-list";
import { JobFilters } from "@/components/jobs/job-filters";
import { RegionUrgentAlert } from "@/components/jobs/region-urgent-alert";
import { buttonVariants } from "@/components/ui/button";
import { jobFeedKey, PAGE_SIZE } from "@/lib/feed";
import { parseJobRegion } from "@/lib/job-status";
import { loadJobPage } from "@/lib/load-feed";
import { resolveJobKind } from "@/lib/nav";
import { cn } from "cn";
import { BoardBottomAd } from "@/components/ads/board-bottom-ad";
import { getCurrentUser } from "@/lib/current-user";
import { BOARD_STICKER, BoardTitle } from "@/components/brand/oni";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ region?: string; open?: string }>;

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ kind: string }>;
  searchParams: SearchParams;
}): Promise<Metadata> {
  const { kind } = await params;
  const job = resolveJobKind(kind);
  if (!job) return { title: "구인구직" };
  const region = parseJobRegion((await searchParams).region);
  if (region) {
    return { title: `${region} ${job.title} · 구인구직`, description: `${region} 지역 ${job.blurb}` };
  }
  return { title: `${job.title} · 구인구직`, description: job.blurb };
}

export default async function JobBoardPage({
  params,
  searchParams,
}: {
  params: Promise<{ kind: string }>;
  searchParams: SearchParams;
}) {
  const { kind } = await params;
  const job = resolveJobKind(kind);
  if (!job) notFound();
  const query = await searchParams;
  const region = parseJobRegion(query.region);
  const openOnly = query.open === "1";
  const feedKey = jobFeedKey(job.kind);
  // 비로그인은 제목만 보이게 조건·주소 등을 빼고 내려보냅니다.
  const guest = !(await getCurrentUser().catch(() => null));
  const page = await loadJobPage(feedKey, { offset: 0, limit: PAGE_SIZE, region, openOnly, guest });
  const writeHref = `/boards/jobs/${kind}/write`;

  return (
    <div className="flex flex-col gap-4">
      <header className="board-intro flex flex-wrap items-end justify-between gap-3">
        <div>
          <BoardTitle sticker={BOARD_STICKER[kind] ?? BOARD_STICKER.jobs}>{region ? `${region} ${job.title}` : job.title}</BoardTitle>
          <p className="mt-2">
            {job.blurb}. 제목은 지역·상호(조건)로 자동 붙습니다. 연락처와 본문은 로그인 후 볼 수 있습니다.
            {page.total ? ` · ${page.total}개` : ""}
          </p>
        </div>
        <Link
          href={writeHref}
          className={cn(buttonVariants({ size: "touch" }), "relative z-10 inline-flex w-full shrink-0 sm:w-auto")}
        >
          {job.cta}
        </Link>
      </header>
      {job.kind === "URGENT" ? <RegionUrgentAlert /> : null}
      <JobFilters basePath={`/boards/jobs/${kind}`} region={region} openOnly={openOnly} />
      <InfiniteJobList
        key={`${region ?? "all"}-${openOnly}`}
        feedKey={feedKey}
        initialItems={page.jobs}
        initialTotal={page.total}
        initialNextOffset={page.nextOffset}
        region={region}
        openOnly={openOnly}
        emptyText={region ? `${region} 지역 ${job.title} 글이 아직 없습니다.` : `아직 ${job.title} 글이 없습니다.`}
        emptyAction={{ href: writeHref, label: `첫 ${job.cta}하기` }}
      />
      <BoardBottomAd />
    </div>
  );
}
