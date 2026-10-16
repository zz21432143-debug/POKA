import Link from "next/link";
import { formatWon } from "@/lib/jobs";
import { CrownIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { JobEventList, JobTagList, jobTags } from "@/components/jobs/job-facts";
import { JOB_KIND_LABEL } from "@/lib/nav";
import type { JobFactsPost } from "@/components/jobs/job-facts";
import type { JobStatus } from "@/lib/job-status";
import { AuthorChip } from "@/components/posts/author-chip";
import { EmptyBoard, type EmptyAction } from "@/components/posts/empty-board";
import { formatRelativeKst } from "@/lib/dates";
import { cn } from "cn";

export type JobCardData = JobFactsPost & {
  id: string;
  title: string;
  isPaid: boolean;
  status: JobStatus;
  createdAt: string;
  authorNickname: string | null;
  authorLevel: number | null;
  author: import("@/components/posts/author-chip").PublicAuthor;
};

export function JobStatusBadge({ status, seeking = false }: { status: JobStatus; seeking?: boolean }) {
  if (status === "open") return <Badge className="bg-emerald-700 text-white">{seeking ? "구직중" : "모집중"}</Badge>;
  return (
    <Badge variant="secondary" className="bg-[#3a332c] text-[#c9c0b2]">
      {status === "filled" ? (seeking ? "구직 완료" : "채용 완료") : "기간 마감"}
    </Badge>
  );
}

export function JobCards({
  jobs,
  emptyText = "아직 올라온 공고가 없습니다.",
  emptyAction,
}: {
  jobs: JobCardData[];
  emptyText?: string;
  emptyAction?: EmptyAction;
}) {
  if (jobs.length === 0) {
    return <EmptyBoard text={emptyText} action={emptyAction} />;
  }

  return (
    <ul className="grid gap-3">
      {jobs.map((job) => {
        const closed = job.status !== "open";
        const premium = job.isPaid && !closed;
        return (
          <li
            key={job.id}
            className={cn(
              "ink-panel rounded-xl p-3 hover:bg-[#241c1e]",
              premium && "border border-[#c9a25c]/70 shadow-[0_0_0_1px_rgba(201,162,92,0.25)]",
              closed && "bg-[#151313] opacity-60 grayscale",
            )}
          >
            <Link href={`/posts/${job.id}`} className="touch-target block text-white hover:text-white">
              <div className="flex flex-wrap items-center gap-2">
                {premium ? (
                  <Badge className="gap-1 bg-gradient-to-r from-[#e7c98a] to-[#c59b27] text-[#1d1611]">
                    <CrownIcon className="size-3" />
                    프리미엄
                  </Badge>
                ) : null}
                <Badge variant="secondary">
                  {JOB_KIND_LABEL[job.jobKind as keyof typeof JOB_KIND_LABEL] ?? "구인"}
                </Badge>
                <JobStatusBadge status={job.status} seeking={job.jobKind === "SEEKING"} />
                <span className="ml-auto text-xs text-[#9CA3AF]">{formatRelativeKst(job.createdAt)}</span>
              </div>
              <p className={cn("mt-2 text-lg font-bold", closed ? "text-[#c9c0b2] line-through decoration-1" : "text-white")}>
                {job.title}
              </p>
              {(job.jobKind === "FIXED" || job.jobKind === "TEAM") && (job.jobPayAmount || job.jobLocation) ? (
                <p data-job-card-pay className="mt-1 flex flex-wrap items-baseline gap-x-2 text-sm">
                  {job.jobPayAmount ? (
                    <b className="text-base font-black text-[#ffcf4a]">
                      {job.jobPayType ?? "급여"} {formatWon(job.jobPayAmount)}
                    </b>
                  ) : null}
                  {job.jobLocation ? <span className="text-[#c9c0b2]">📍 {job.jobLocation}</span> : null}
                  {job.jobWorkHours ? <span className="text-[#c9c0b2]">🕒 {job.jobWorkHours}</span> : null}
                </p>
              ) : null}
              <JobEventList job={job} compact />
              <JobTagList tags={jobTags(job)} />
            </Link>
            <div className="mt-2">
              <AuthorChip author={job.author} anonymous={false} size="sm" />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
