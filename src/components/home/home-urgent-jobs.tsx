import Link from "@/components/ui/link";
import { BrandIcon } from "@/components/brand/brand-icon";

import { formatWon } from "@/lib/jobs";

export type HomeUrgentJob = {
  id: string;
  title: string;
  jobLocation: string | null;
  jobWorkDate: string | null;
  jobPayAmount: string | null;
};

export function HomeUrgentJobs({
  jobs,
  region = null,
}: {
  jobs: HomeUrgentJob[];
  region?: string | null;
}) {
  const listHref = region
    ? `/boards/jobs/urgent?region=${encodeURIComponent(region)}&open=1`
    : "/boards/jobs/urgent?open=1";
  return (
    <section className="lounge-card overflow-hidden rounded-[1.35rem]">
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2.5">
        <span className="inline-flex items-center gap-1.5 text-base font-bold">
          <BrandIcon name="flame" className="size-5" />
          {region ? `${region} 급구 / 대타` : "급구 / 대타"}
        </span>
        <Link href={listHref} className="more-link ml-auto">
          더보기
        </Link>
      </div>
      {jobs.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-4 py-7 text-center text-sm text-muted-foreground">
          <p>지금 모집중인 급구가 없습니다.</p>
          <Link
            href="/boards/jobs/urgent/write"
            className="touch-target inline-flex min-h-10 items-center rounded-full bg-[#8b2222] px-4 font-semibold text-white hover:bg-[#a12a2a]"
          >
            급구 올리기
          </Link>
        </div>
      ) : (
        <>
          <ul className="divide-y divide-border max-sm:[&>li:nth-child(n+4)]:hidden">
            {jobs.map((job) => (
              <li key={job.id}>
                <Link
                  href={`/posts/${job.id}`}
                  className="touch-target flex min-h-14 items-center gap-3 px-4 py-3 text-[#E5E7EB] hover:bg-white/[0.07] hover:text-white"
                >
                  <span className="shrink-0 rounded-full bg-[#8B2222] px-2 py-0.5 text-[11px] font-bold text-white">
                    급구
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-bold leading-snug">
                      {job.title}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                      {[
                        job.jobLocation,
                        job.jobWorkDate,
                        formatWon(job.jobPayAmount)
                          ? `시급 ${formatWon(job.jobPayAmount)}`
                          : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          {jobs.length > 3 ? (
            <Link
              href={listHref}
              data-mobile-more
              className="flex min-h-11 items-center justify-center border-t border-border text-sm font-bold text-[#e7c98a] sm:hidden"
            >
              급구 {jobs.length - 3}개 더 보기 ›
            </Link>
          ) : null}
        </>
      )}
    </section>
  );
}
