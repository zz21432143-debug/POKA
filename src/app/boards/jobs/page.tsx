import Link from "next/link";
import { JOB_KINDS } from "@/lib/nav";
import { BriefcaseIcon } from "lucide-react";

export default function JobsHubPage() {
  const kinds = Object.entries(JOB_KINDS);
  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="text-2xl font-semibold">딜러 구인 · 구직</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          고정 직원부터 급구·개인 구직까지, 현장 구인을 한곳에서 봅니다.
        </p>
      </header>
      <ul className="grid gap-3 sm:grid-cols-2">
        {kinds.map(([slug, job]) => (
          <li key={slug}>
            <Link
              href={`/boards/jobs/${slug}`}
              className="touch-target flex min-h-28 flex-col rounded-2xl border border-border bg-white p-5 shadow-sm hover:border-primary/40"
            >
              <BriefcaseIcon className="size-5 text-primary" />
              <p className="mt-3 font-semibold">{job.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{job.blurb}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
