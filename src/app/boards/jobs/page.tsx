import type { Metadata } from "next";
import Link from "next/link";
import { JOB_KINDS } from "@/lib/nav";
import { BriefcaseIcon } from "lucide-react";

export const metadata: Metadata = {
  title: "홀덤펍 딜러 구인 · 구직 — POKA",
  description: "지역이 제목에 붙는 홀덤 딜러 구인.",
};

export default function JobsHubPage() {
  const kinds = Object.entries(JOB_KINDS);
  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="text-2xl font-semibold">홀덤 딜러 구인 · 구직</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          제목에 지역이 붙습니다. 홀덤펍 딜러·스태프 구인입니다.
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
