import { BackToList } from "@/components/posts/back-to-list";
import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRightIcon } from "lucide-react";
import { JOB_KINDS } from "@/lib/nav";

export const metadata: Metadata = {
  title: "구인구직 글쓰기",
};

export default function JobWriteChooserPage() {
  const kinds = Object.entries(JOB_KINDS);
  return (
    <div className="flex flex-col gap-4">
      <BackToList href="/boards/jobs" className="self-start" />
      <header className="board-intro">
        <h1>어떤 공고를 올릴까요?</h1>
        <p className="mt-2">분류를 고르면 맞는 작성 양식이 열립니다.</p>
      </header>
      <ul className="grid gap-2 sm:grid-cols-2">
        {kinds.map(([slug, job]) => (
          <li key={slug}>
            <Link
              href={`/boards/jobs/${slug}/write`}
              className="ink-panel touch-target flex min-h-20 items-center gap-3 rounded-2xl p-4 hover:bg-[#241c1e]"
            >
              <span className="min-w-0 flex-1">
                <span className="block text-base font-bold text-white">{job.cta} · {job.title}</span>
                <span className="mt-1 block text-sm text-[#D1D5DB]">{job.blurb}</span>
              </span>
              <ChevronRightIcon className="size-5 shrink-0 text-[#C59B27]" />
            </Link>
          </li>
        ))}
      </ul>
      <p className="text-sm text-muted-foreground">
        일반 글은{" "}
        <Link href="/boards/free/write" className="font-semibold text-[#e7c98a] underline-offset-4 hover:underline">
          자유 게시판 글쓰기
        </Link>
        에서 쓸 수 있습니다.
      </p>
    </div>
  );
}
