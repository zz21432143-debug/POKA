import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { JobTagList, jobTags } from "@/components/jobs/job-facts";
import { JOB_KIND_LABEL } from "@/lib/nav";
import type { JobFactsPost } from "@/components/jobs/job-facts";
import { AuthorChip } from "@/components/posts/author-chip";

export type JobCardData = JobFactsPost & {
  id: string;
  title: string;
  isPaid: boolean;
  authorNickname: string | null;
  authorLevel: number | null;
  author: import("@/components/posts/author-chip").PublicAuthor;
};

export function JobCards({ jobs }: { jobs: JobCardData[] }) {
  if (jobs.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
        등록된 글이 없습니다.
      </p>
    );
  }

  return (
    <ul className="grid gap-3">
      {jobs.map((job) => (
        <li key={job.id} className="rounded-xl border border-border bg-card p-3 hover:bg-muted/40">
          <Link href={`/posts/${job.id}`} className="touch-target block">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">
                {JOB_KIND_LABEL[job.jobKind as keyof typeof JOB_KIND_LABEL] ?? "구인"}
              </Badge>
              {job.isPaid ? <Badge>유료 고정</Badge> : null}
            </div>
            <p className="mt-2 text-lg font-semibold">{job.title}</p>
            <JobTagList tags={jobTags(job)} />
          </Link>
          <div className="mt-2">
            <AuthorChip author={job.author} anonymous={false} size="sm" />
          </div>
        </li>
      ))}
    </ul>
  );
}
