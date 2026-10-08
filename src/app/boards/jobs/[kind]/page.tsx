import Link from "next/link";
import { notFound } from "next/navigation";
import { InfiniteJobList } from "@/components/jobs/infinite-job-list";
import { buttonVariants } from "@/components/ui/button";
import { jobFeedKey, PAGE_SIZE } from "@/lib/feed";
import { loadFeedPage } from "@/lib/load-feed";
import { resolveJobKind } from "@/lib/nav";
import { cn } from "cn";

export const dynamic = "force-dynamic";

export default async function JobBoardPage({
  params,
}: {
  params: Promise<{ kind: string }>;
}) {
  const { kind } = await params;
  const job = resolveJobKind(kind);
  if (!job) notFound();
  const feedKey = jobFeedKey(job.kind);
  const page = await loadFeedPage(feedKey, 0, PAGE_SIZE);

  return (
    <div className="flex flex-col gap-4">
      <header className="board-intro flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1>{job.title}</h1>
          <p className="mt-2">
            {job.blurb}. 제목은 지역·상호(조건)로 자동 붙습니다. 연락처와 본문은 로그인 후 볼 수 있습니다.
            {page.total ? ` · ${page.total}개` : ""}
          </p>
        </div>
        <Link
          href={`/boards/jobs/${kind}/write`}
          className={cn(buttonVariants({ size: "touch" }), "relative z-10 inline-flex w-full shrink-0 sm:w-auto")}
        >
          {job.cta}
        </Link>
      </header>
      <InfiniteJobList
        feedKey={feedKey}
        initialItems={page.jobs}
        initialTotal={page.total}
        initialNextOffset={page.nextOffset}
      />
    </div>
  );
}
