import Link from "@/components/ui/link";
import { ChevronRightIcon, CrownIcon, PenSquareIcon } from "lucide-react";
import { EmptyBoard } from "@/components/posts/empty-board";
import { formatRelativeKst } from "@/lib/dates";
import { formatWon, titleRegion } from "@/lib/jobs";
import { eventsDateLabel, parseJobEvents } from "@/lib/job-events";
import { cn } from "cn";
import { BrandIcon } from "@/components/brand/brand-icon";

export type HomeApplyJob = {
  id: string;
  title: string;
  isPaid: boolean;
  createdAt: string;
  jobLocation: string | null;
  jobCompanyName: string | null;
  jobPayAmount: string | null;
  jobKind: string | null;
  jobWorkDate: string | null;
  jobEndDate: string | null;
  jobEvents: string | null;
  jobDateFlexible: boolean;
  jobGuaranteedHours: string | null;
  jobTravelPay: boolean;
  jobTravelPayAmount: string | null;
};

/** "2026-10-17" → "10/17(금)" */
function shortDate(value: string | null) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const [y, m, d] = value.split("-").map(Number);
  const day = "일월화수목금토"[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `${m}/${d}(${day})`;
}

/** 시작~끝 날짜. 끝 날짜가 없으면 하루만. */
function dateRange(start: string | null, end: string | null) {
  const a = shortDate(start);
  if (!a) return null;
  if (!end || end === start) return a;
  return `${a}~${shortDate(end)}`;
}

/**
 * 홈 메인 공고. 사이트의 중심인 지원 딜러·대회 딜러 구인을 카드로 크게 보여 줍니다.
 * 지역·시급·근무일·보장 시간·차비를 제목 아래 바로 보여 줘 눌러 보지 않아도 조건이 보이게 합니다.
 */
export function HomeJobs({ jobs }: { jobs: HomeApplyJob[] }) {
  return (
    <section className="lounge-card overflow-hidden rounded-[1.35rem]">
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2.5">
        <h2 className="inline-flex items-center gap-2 text-base font-bold text-white">
          <BrandIcon name="chips" className="size-5" />
          지원 · 대회 딜러 구인
          {jobs.length ? (
            <span className="rounded-full bg-emerald-700 px-2 py-0.5 text-xs font-bold text-white">
              모집중 {jobs.length}
            </span>
          ) : null}
        </h2>
        <Link href="/boards/jobs/apply?open=1" className="more-link ml-auto">
          전체보기
        </Link>
      </div>

      {jobs.length === 0 ? (
        <EmptyBoard
          text="지금 모집중인 지원 딜러 공고가 없습니다."
          framed={false}
          action={{
            href: "/boards/jobs/apply/write",
            label: "지원 딜러 구인 올리기",
          }}
        />
      ) : (
        <>
          <ul className="grid gap-2 p-3 sm:grid-cols-2 xl:grid-cols-3 max-sm:[&>li:nth-child(n+4)]:hidden">
            {jobs.map((job) => {
              const pay = formatWon(job.jobPayAmount);
              const travel = job.jobTravelPay
                ? formatWon(job.jobTravelPayAmount) || "지원"
                : null;
              const tournament = job.jobKind === "TOURNAMENT";
              const when = job.jobDateFlexible
                ? tournament
                  ? "일정 추후 공지"
                  : "날짜 협의"
                : eventsDateLabel(parseJobEvents(job.jobEvents)) ||
                  dateRange(job.jobWorkDate, job.jobEndDate);
              return (
                <li key={job.id}>
                  <Link
                    href={`/posts/${job.id}`}
                    className={cn(
                      "touch-target flex h-full flex-col gap-2 rounded-xl border bg-[#141110] p-3 hover:border-[#c9a25c]/80 hover:bg-[#201915]",
                      job.isPaid ? "border-[#c9a25c]/70" : "border-white/10",
                    )}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="rounded-md bg-[#7a1c22] px-1.5 py-0.5 text-[11px] font-bold text-white">
                        {titleRegion(job.jobLocation)}
                      </span>
                      <span
                        className={cn(
                          "rounded-md px-1.5 py-0.5 text-[11px] font-bold",
                          tournament
                            ? "bg-[#1f4e79] text-white"
                            : "bg-white/10 text-[#E5E7EB]",
                        )}
                      >
                        {tournament ? "대회" : "지원"}
                      </span>
                      {job.isPaid ? (
                        <span className="inline-flex items-center gap-0.5 rounded-md bg-gradient-to-r from-[#e7c98a] to-[#c59b27] px-1.5 py-0.5 text-[11px] font-bold text-[#1d1611]">
                          <CrownIcon className="size-3" />
                          프리미엄
                        </span>
                      ) : null}
                      <span className="ml-auto text-[11px] text-[#9CA3AF]">
                        {formatRelativeKst(job.createdAt)}
                      </span>
                    </div>
                    <p className="line-clamp-2 text-[15px] font-bold leading-snug text-white">
                      {job.jobCompanyName || job.title}
                    </p>
                    <div className="flex flex-wrap items-center gap-1.5 text-[12px] font-semibold">
                      {pay ? (
                        <span className="rounded-full bg-[#c9a25c] px-2 py-0.5 text-[#1d1611]">
                          시급 {pay}
                        </span>
                      ) : null}
                      {when ? (
                        <span className="rounded-full border border-white/20 px-2 py-0.5 text-[#E5E7EB]">
                          {when}
                        </span>
                      ) : null}
                      {job.jobGuaranteedHours ? (
                        <span className="rounded-full border border-white/20 px-2 py-0.5 text-[#E5E7EB]">
                          보장 {job.jobGuaranteedHours}
                        </span>
                      ) : null}
                      {travel ? (
                        <span className="rounded-full border border-emerald-600/60 px-2 py-0.5 text-emerald-300">
                          차비 {travel}
                        </span>
                      ) : null}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
          {jobs.length > 3 ? (
            <Link
              href={"/boards/jobs/apply?open=1"}
              data-mobile-more
              className="flex min-h-11 items-center justify-center border-t border-border text-sm font-bold text-[#e7c98a] sm:hidden"
            >
              공고 {jobs.length - 3}개 더 보기 ›
            </Link>
          ) : null}
        </>
      )}

      <div className="grid grid-cols-2 border-t border-white/10">
        <Link
          href="/boards/jobs/apply/write"
          className="touch-target flex min-h-12 items-center justify-center gap-1.5 bg-[#8b2222] text-sm font-bold text-white hover:bg-[#a12a2a]"
        >
          <PenSquareIcon className="size-4" />
          구인 올리기
        </Link>
        <Link
          href="/boards/jobs"
          className="touch-target flex min-h-12 items-center justify-center gap-1 text-sm font-bold text-[#e7c98a] hover:bg-[#2a2017]"
        >
          지역별 공고
          <ChevronRightIcon className="size-4" />
        </Link>
      </div>
    </section>
  );
}
