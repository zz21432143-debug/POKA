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
import { JOB_REGIONS, openJobWhere, parseJobRegion, regionWhere } from "@/lib/job-status";
import { loadJobPage } from "@/lib/load-feed";
import { JOB_KINDS } from "@/lib/nav";
import { cn } from "cn";
import { parseJobTagParam } from "@/lib/job-tags";
import { BoardBottomAd } from "@/components/ads/board-bottom-ad";
import { getCurrentUser } from "@/lib/current-user";
import { BOARD_STICKER, BoardTitle } from "@/components/brand/oni";
import { RegionSummary } from "@/components/jobs/region-summary";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ region?: string; open?: string; tag?: string }>;

export async function generateMetadata({ searchParams }: { searchParams: SearchParams }): Promise<Metadata> {
  const region = parseJobRegion((await searchParams).region);
  if (region) {
    return {
      title: `${region} 홀덤 딜러 구인 · 급구 대타`,
      description: `${region} 지역 홀덤펍 지원 딜러 구인, 급구 대타, 고정·팀 구인 공고를 모아 봅니다.`,
      // 같은 목록의 대표 주소는 /jobs/서울
      alternates: { canonical: `/jobs/${region}` },
    };
  }
  return {
    title: "홀덤 딜러 구인구직 · 급구 대타",
    description: "홀덤펍 지원 딜러 구인과 급구 대타, 대회 딜러, 고정·팀 구인을 한곳에서. 지역별로 골라 보고 급구 알림도 받아요.",
    alternates: { canonical: "/boards/jobs" },
  };
}

export default async function JobsHubPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const region = parseJobRegion(params.region);
  const openOnly = params.open === "1";
  const tag = parseJobTagParam(params.tag);
  const [page, urgent] = await Promise.all([
    loadJobPage("jobs", { offset: 0, limit: PAGE_SIZE, region, openOnly, tag, guest: !(await getCurrentUser().catch(() => null)) }).catch(() => ({
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
        {/* 휴대폰은 한 줄 설명 + 버튼 두 개를 나란히(공고가 첫 화면에 빨리 보이게) */}
        <p className="mt-2 sm:hidden">지원 딜러 · 급구 대타 · 고정 · 팀 구인. 연락처는 로그인 후.</p>
        <p className="mt-2 hidden sm:block">
          홀덤펍 지원 딜러·급구 대타·고정 딜러·팀 구인. 지역으로 골라 보고, 연락처는 로그인 회원만 봅니다.
          급구는 근무일이 지나면, 일반 공고는 30일이 지나면 자동 마감됩니다.
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:mt-4 sm:flex sm:items-center">
          <Link
            href="/boards/jobs/apply/write"
            className={cn(buttonVariants({ size: "touch" }), "relative z-10 gap-1.5")}
          >
            <PenSquareIcon className="size-4" />
            <span className="sm:hidden">구인 등록</span>
            <span className="hidden sm:inline">지원 딜러 구인 등록</span>
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
            className="col-span-2 inline-flex min-h-10 items-center justify-center text-sm font-semibold text-[#e7c98a] underline-offset-4 hover:underline sm:ml-1"
          >
            고정 · 팀 구인 등록
          </Link>
        </div>
      </header>

      {region ? <RegionSummary region={region} /> : null}
      {/* 날짜별 빈자리 보드(지원 딜러 · 급구 · 대회) · 내 공고 한 번에 갱신 */}
      <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
        <Link
          href={region ? `/boards/jobs/slots?region=${encodeURIComponent(region)}` : "/boards/jobs/slots"}
          data-jobs-slots-link
          className="flex min-h-14 items-center gap-2.5 rounded-2xl border-2 border-[#ffcf4a]/70 bg-gradient-to-r from-[#3a2a0c] to-[#1d1611] px-4 hover:border-[#ffcf4a]"
        >
          <span className="text-2xl" aria-hidden>
            📅
          </span>
          <span className="min-w-0 flex-1">
            <b className="block text-base text-white">날짜별 빈자리 보기</b>
            <span className="block truncate text-xs text-[#e7c98a]">지원 딜러 · 급구 · 대회 — 쉬는 날 일할 곳을 바로</span>
          </span>
          <span className="text-[#ffcf4a]">›</span>
        </Link>
        <Link href="/boards/jobs/mine" className="inline-flex min-h-14 items-center justify-center rounded-2xl border border-white/15 bg-black/30 px-4 text-sm font-bold text-white hover:bg-white/5">
          📋 내 공고 붙여넣고 갱신
        </Link>
      </div>

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
        <JobFilters basePath="/boards/jobs" region={region} openOnly={openOnly} tag={tag} />
        <InfiniteJobList
          key={`${region ?? "all"}-${openOnly}-${tag ?? ""}`}
          tag={tag}
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
      {/* 지역별 구인 바로가기(검색엔진이 지역 페이지를 찾을 수 있게) */}
      <nav aria-label="지역별 홀덤 딜러 구인" className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[#9CA3AF]">
        <span className="font-semibold text-[#d1c7b5]">지역별 홀덤 딜러 구인</span>
        {JOB_REGIONS.map((name) => (
          <Link key={name} href={`/jobs/${name}`} aria-current={name === region ? "page" : undefined} className="inline-flex min-h-10 min-w-10 items-center justify-center px-1 hover:text-white">
            {name}
          </Link>
        ))}
      </nav>
      <BoardBottomAd />
    </div>
  );
}
