import Link from "next/link";
import { SirenIcon } from "lucide-react";

export type HomeUrgentJob = {
  id: string;
  title: string;
  jobLocation: string | null;
  jobWorkDate: string | null;
  jobPayAmount: string | null;
};

export function HomeUrgentJobs({ jobs }: { jobs: HomeUrgentJob[] }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
        <span className="inline-flex items-center gap-1.5 text-base font-semibold">
          <SirenIcon className="size-4 text-rose-600" />
          급구 / 대타
        </span>
        <Link href="/boards/jobs/urgent" className="ml-auto text-xs text-muted-foreground hover:text-primary">
          더보기
        </Link>
      </div>
      {jobs.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-muted-foreground">
          올라온 급구가 없습니다.{" "}
          <Link href="/boards/jobs/urgent/write" className="font-semibold text-primary">
            급구 등록
          </Link>
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {jobs.map((job) => (
            <li key={job.id}>
              <Link
                href={`/posts/${job.id}`}
                className="touch-target flex min-h-14 items-center gap-3 px-4 py-3 hover:bg-muted/50"
              >
                <span className="shrink-0 rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-bold text-rose-700">
                  급구
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{job.title}</span>
                  <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                    {[job.jobLocation, job.jobWorkDate, job.jobPayAmount ? `${job.jobPayAmount}` : null]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
