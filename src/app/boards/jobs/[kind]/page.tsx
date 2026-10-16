import type { Metadata } from "next";
import { parseJobTagParam } from "@/lib/job-tags";
import Link from "next/link";
import { notFound } from "next/navigation";
import { InfiniteJobList } from "@/components/jobs/infinite-job-list";
import { JobFilters } from "@/components/jobs/job-filters";
import { RegionUrgentAlert } from "@/components/jobs/region-urgent-alert";
import { buttonVariants } from "@/components/ui/button";
import { jobFeedKey, PAGE_SIZE } from "@/lib/feed";
import { JOB_REGIONS, parseJobRegion } from "@/lib/job-status";
import { loadJobPage } from "@/lib/load-feed";
import { resolveJobKind } from "@/lib/nav";
import { cn } from "cn";
import { BoardBottomAd } from "@/components/ads/board-bottom-ad";
import { getCurrentUser } from "@/lib/current-user";
import { BOARD_STICKER, BoardTitle } from "@/components/brand/oni";
import { ApplyChat } from "@/components/jobs/apply-chat";
import { loadApplyChat } from "@/lib/job-chat";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ region?: string; open?: string; tag?: string; view?: string }>;

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
  const tag = parseJobTagParam(query.tag);
  const feedKey = jobFeedKey(job.kind);
  // 비로그인은 제목만 보이게 조건·주소 등을 빼고 내려보냅니다.
  const viewer = await getCurrentUser().catch(() => null);
  const guest = !viewer;
  // 지원 딜러 구인: 카카오톡 오픈채팅처럼(공고 = 말풍선 · 최신이 맨 아래 · 붙여넣어 바로 올리기) — ?view=list 면 예전 목록
  const chat = job.kind === "APPLY" && query.view !== "list";
  const [page, chatMessages] = await Promise.all([
    chat ? Promise.resolve({ jobs: [], total: 0, nextOffset: null }) : loadJobPage(feedKey, { offset: 0, limit: PAGE_SIZE, region, openOnly, tag, guest }),
    chat ? loadApplyChat({ region, guest }) : Promise.resolve([]),
  ]);
  const writeHref = `/boards/jobs/${kind}/write`;

  return (
    <div className="flex flex-col gap-4">
      <header className="board-intro flex flex-wrap items-end justify-between gap-3">
        <div>
          <BoardTitle sticker={BOARD_STICKER[kind] ?? BOARD_STICKER.jobs}>{region ? `${region} ${job.title}` : job.title}</BoardTitle>
          {chat ? (
            <p className="mt-1 text-sm">카톡 공고를 붙여넣으면 바로 올라가요 · 연락처는 로그인 후</p>
          ) : (
            <p className="mt-2">
              {job.blurb}. 제목은 지역·상호(조건)로 자동 붙습니다. 연락처와 본문은 로그인 후 볼 수 있습니다.
              {page.total ? ` · ${page.total}개` : ""}
            </p>
          )}
        </div>
        {chat ? null : (
          <Link
            href={writeHref}
            className={cn(buttonVariants({ size: "touch" }), "relative z-10 inline-flex w-full shrink-0 sm:w-auto")}
          >
            {job.cta}
          </Link>
        )}
      </header>
      {job.kind === "URGENT" ? <RegionUrgentAlert /> : null}
      {chat ? (
        <>
          <nav aria-label="지역" className="card-scroller -mx-1 overflow-x-auto px-1">
            <ul className="flex w-max gap-1.5">
              {[null, ...JOB_REGIONS].map((r) => (
                <li key={r ?? "all"}>
                  <Link
                    href={r ? `/boards/jobs/apply?region=${encodeURIComponent(r)}` : "/boards/jobs/apply"}
                    className={cn("touch-target inline-flex min-h-9 items-center rounded-full border px-3 text-sm font-bold", (r ?? null) === region ? "border-[#fee500] bg-[#fee500] text-[#1d1d1d]" : "border-white/15 text-zinc-300")}
                  >
                    {r ?? "전국"}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <ApplyChat key={region ?? "all"} initial={chatMessages} region={region} loggedIn={!guest} myNickname={viewer?.nickname ?? null} />
          <Link href={`/boards/jobs/apply?view=list${region ? `&region=${encodeURIComponent(region)}` : ""}`} className="self-center text-sm font-bold text-[#e7c98a] underline">
            예전처럼 목록으로 보기
          </Link>
        </>
      ) : null}
      {chat ? null : <JobFilters basePath={`/boards/jobs/${kind}`} region={region} openOnly={openOnly} tag={tag} />}
      {chat ? null : <InfiniteJobList
        key={`${region ?? "all"}-${openOnly}-${tag ?? ""}`}
        tag={tag}
        feedKey={feedKey}
        initialItems={page.jobs}
        initialTotal={page.total}
        initialNextOffset={page.nextOffset}
        region={region}
        openOnly={openOnly}
        emptyText={region ? `${region} 지역 ${job.title} 글이 아직 없습니다.` : `아직 ${job.title} 글이 없습니다.`}
        emptyAction={{ href: writeHref, label: `첫 ${job.cta}하기` }}
      />}
      <BoardBottomAd />
    </div>
  );
}
