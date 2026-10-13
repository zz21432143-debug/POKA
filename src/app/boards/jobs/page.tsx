import type { Metadata } from "next";
import Link from "next/link";
import { BriefcaseIcon, PenSquareIcon, SirenIcon } from "lucide-react";
import { HomeUrgentJobs, type HomeUrgentJob } from "@/components/home/home-urgent-jobs";
import { InfiniteJobList } from "@/components/jobs/infinite-job-list";
import { JobFilters } from "@/components/jobs/job-filters";
import { RegionUrgentAlert } from "@/components/jobs/region-urgent-alert";
import { buttonVariants } from "@/components/ui/button";
import { prisma } from "@/lib/db";
import { PAGE_SIZE } from "@/lib/feed";
import { openJobWhere, parseJobRegion, regionWhere } from "@/lib/job-status";
import { loadJobPage } from "@/lib/load-feed";
import { JOB_KINDS } from "@/lib/nav";
import { cn } from "cn";
import { BoardBottomAd } from "@/components/ads/board-bottom-ad";
import { getCurrentUser } from "@/lib/current-user";
import { BOARD_STICKER, BoardTitle } from "@/components/brand/oni";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ region?: string; open?: string }>;

export async function generateMetadata({ searchParams }: { searchParams: SearchParams }): Promise<Metadata> {
  const region = parseJobRegion((await searchParams).region);
  if (region) {
    return {
      title: `${region} 홀덤펍 딜러 구인구직`,
      description: `${region} 지역 홀덤펍 지원 딜러 구인, 급구 대타, 고정·팀 구인 공고를 모아 봅니다.`,
    };
  }
  return {
    title: "홀덤펍 딜러 구인구직",
    description: "홀덤펍 지원 딜러 구인과 급구 대타, 고정·팀 구인을 한곳에서. 지역별로 골라 볼 수 있습니다.",
  };
}

export default async function JobsHubPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const region = parseJobRegion(params.region);
  const openOnly = params.open === "1";
  const [page, urgent] = await Promise.all([
    loadJobPage("jobs", { offset: 0, limit: PAGE_SIZE, region, openOnly, guest: !(await getCurrentUser().catch(() => null)) }).catch(() => ({
      jobs: [],
      total: 0,
      nextOffset: null,
    })),
    prisma.post
      .findMany({
        where: {
          AND: [
            { boardType: "JOBS", jobKind: "URGENT", hidden: false, isAttendanceThread: false },
            regionWhere(region),
            openJobWhere(),
          ],
        },
        orderBy: { bumpedAt: "desc" },
        take: 5,
        select: { id: true, title: true, jobLocation: true, jobWorkDate: true, jobPayAmount: true },
      })
      .catch(() => [] as HomeUrgentJob[]),
  ]);
  const kinds = Object.entries(JOB_KINDS);

  return (
    <div className="flex flex-col gap-4">
      <header className="board-intro">
        <BoardTitle sticker={BOARD_STICKER.jobs}>{region ? `${region} 구인구직` : "구인구직"}</BoardTitle>
        <p className="mt-2">
          홀덤펍 지원 딜러·급구 대타·고정 딜러·팀 구인. 지역으로 골라 보고, 연락처는 로그인 회원만 봅니다.
          급구는 근무일이 지나면, 일반 공고는 30일이 지나면 자동 마감됩니다.
        </p>
        <div className="mt-4 grid grid-cols-1 gap-2 sm:flex sm:items-center">
          <Link
            href="/boards/jobs/apply/write"
            className={cn(buttonVariants({ size: "touch" }), "relative z-10 gap-1.5")}
          >
            <PenSquareIcon className="size-4" />
            지원 딜러 구인 등록
          </Link>
          <Link
            href="/boards/jobs/urgent/write"
            className={cn(buttonVariants({ size: "touch", variant: "outline" }), "relative z-10 gap-1.5")}
          >
            <SirenIcon className="size-4" />
            급구 / 대타 등록
          </Link>
          <Link
            href="/boards/jobs/write"
            className="inline-flex min-h-10 items-center justify-center text-sm font-semibold text-[#e7c98a] underline-offset-4 hover:underline sm:ml-1"
          >
            고정 · 팀 구인 등록
          </Link>
        </div>
      </header>

      <nav aria-label="구인구직 분류" className="card-scroller -mx-1 overflow-x-auto px-1">
        <ul className="flex w-max gap-2 sm:w-auto sm:flex-wrap">
          {kinds.map(([slug, job]) => (
            <li key={slug}>
              <Link
                href={region ? `/boards/jobs/${slug}?region=${encodeURIComponent(region)}` : `/boards/jobs/${slug}`}
                className="touch-target inline-flex min-h-11 items-center gap-1.5 rounded-full border border-[#c9a25c]/35 bg-[#1d1611] px-4 text-sm font-semibold text-[#f3eadb] hover:border-[#c9a25c]/70 hover:bg-[#2a2017]"
              >
                <BriefcaseIcon className="size-3.5 text-[#C59B27]" />
                {job.title}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <RegionUrgentAlert />

      <HomeUrgentJobs jobs={urgent} region={region} />

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-bold text-white">{region ? `${region} 공고` : "전체 공고"}</h2>
        <JobFilters basePath="/boards/jobs" region={region} openOnly={openOnly} />
        <InfiniteJobList
          key={`${region ?? "all"}-${openOnly}`}
          feedKey="jobs"
          initialItems={page.jobs}
          initialTotal={page.total}
          initialNextOffset={page.nextOffset}
          region={region}
          openOnly={openOnly}
          emptyText={region ? `${region} 지역 공고가 아직 없습니다.` : "아직 올라온 공고가 없습니다."}
          emptyAction={{ href: "/boards/jobs/write", label: "첫 공고 올리기" }}
        />
      </section>
      <BoardBottomAd />
    </div>
  );
}
