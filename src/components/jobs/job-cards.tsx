import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { JOB_KIND_LABEL } from "@/lib/nav";

export type JobCardData = {
  id: string;
  title: string;
  jobKind: string | null;
  jobLocation: string | null;
  jobPay: string | null;
  jobSchedule: string | null;
  jobHeadcount: string | null;
  isPaid: boolean;
  authorNickname: string | null;
  authorLevel: number | null;
  authorMark: string | null;
};

export function JobCards({ jobs }: { jobs: JobCardData[] }) {
  if (jobs.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
        등록된 구인 글이 없습니다.
      </p>
    );
  }

  return (
    <ul className="grid gap-3">
      {jobs.map((job) => (
        <li key={job.id}>
          <Link
            href={`/posts/${job.id}`}
            className="touch-target block rounded-xl border border-border bg-card p-3 hover:bg-muted/40"
          >
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">
                {JOB_KIND_LABEL[job.jobKind as keyof typeof JOB_KIND_LABEL] ?? "구인"}
              </Badge>
              {job.isPaid ? <Badge>유료 고정</Badge> : null}
            </div>
            <p className="mt-2 font-semibold">{job.title}</p>
            <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-sm sm:grid-cols-4">
              <Fact label="지역" value={job.jobLocation} />
              <Fact label="조건" value={job.jobPay} />
              <Fact label="일정" value={job.jobSchedule} />
              <Fact label="인원" value={job.jobHeadcount} />
            </dl>
            <p className="mt-2 text-xs text-muted-foreground">
              {job.authorNickname ?? "회원"}
              {job.authorLevel ? ` · Lv.${job.authorLevel}` : ""}
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function Fact({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-[11px] text-muted-foreground">{label}</dt>
      <dd className="truncate">{value || "—"}</dd>
    </div>
  );
}
