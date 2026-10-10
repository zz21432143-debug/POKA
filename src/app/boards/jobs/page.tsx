import type { Metadata } from "next";
import Link from "next/link";
import { BriefcaseIcon, PenSquareIcon, UserRoundSearchIcon } from "lucide-react";
import { HomeUrgentJobs, type HomeUrgentJob } from "@/components/home/home-urgent-jobs";
import { InfiniteJobList } from "@/components/jobs/infinite-job-list";
import { buttonVariants } from "@/components/ui/button";
import { prisma } from "@/lib/db";
import { PAGE_SIZE } from "@/lib/feed";
import { loadFeedPage } from "@/lib/load-feed";
import { JOB_KINDS } from "@/lib/nav";
import { cn } from "cn";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "홀덤펍 딜러 구인구직",
  description: "홀덤펍 고정·스팟 딜러 구인, 급구 대타, 개인 구직을 한곳에서. 제목에 지역이 붙어 바로 찾을 수 있습니다.",
};

export default async function JobsHubPage() {
  const [page, urgent] = await Promise.all([
    loadFeedPage("jobs", 0, PAGE_SIZE).catch(() => ({ jobs: [], total: 0, nextOffset: null })),
    prisma.post
      .findMany({
        where: { boardType: "JOBS", jobKind: "URGENT", hidden: false, isAttendanceThread: false },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, title: true, jobLocation: true, jobWorkDate: true, jobPayAmount: true },
      })
      .catch(() => [] as HomeUrgentJob[]),
  ]);
  const kinds = Object.entries(JOB_KINDS);

  return (
    <div className="flex flex-col gap-4">
      <header className="board-intro">
        <h1>구인구직</h1>
        <p className="mt-2">홀덤펍 딜러·스태프 구인과 개인 구직. 제목에 지역이 붙고, 연락처는 로그인 회원만 봅니다.</p>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:flex">
          <Link href="/boards/jobs/write" className={cn(buttonVariants({ size: "touch" }), "relative z-10 gap-1.5")}>
            <PenSquareIcon className="size-4" />
            구인 등록
          </Link>
          <Link
            href="/boards/jobs/seek/write"
            className={cn(buttonVariants({ size: "touch", variant: "outline" }), "relative z-10 gap-1.5")}
          >
            <UserRoundSearchIcon className="size-4" />
            구직 등록
          </Link>
        </div>
      </header>

      <nav aria-label="구인구직 분류" className="card-scroller -mx-1 overflow-x-auto px-1">
        <ul className="flex w-max gap-2 sm:w-auto sm:flex-wrap">
          {kinds.map(([slug, job]) => (
            <li key={slug}>
              <Link
                href={`/boards/jobs/${slug}`}
                className="touch-target inline-flex min-h-11 items-center gap-1.5 rounded-full border border-[#c9a25c]/35 bg-[#1d1611] px-4 text-sm font-semibold text-[#f3eadb] hover:border-[#c9a25c]/70 hover:bg-[#2a2017]"
              >
                <BriefcaseIcon className="size-3.5 text-[#C59B27]" />
                {job.title}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <HomeUrgentJobs jobs={urgent} />

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-bold text-white">최신 공고</h2>
        <InfiniteJobList
          feedKey="jobs"
          initialItems={page.jobs}
          initialTotal={page.total}
          initialNextOffset={page.nextOffset}
        />
      </section>
    </div>
  );
}
