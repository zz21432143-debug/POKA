import Link from "next/link";
import { BriefcaseIcon } from "lucide-react";
import { PostList, type PostSummary } from "@/components/posts/post-list";
import { JOB_KINDS } from "@/lib/nav";

export function HomeJobs({ jobs }: { jobs: PostSummary[] }) {
  return (
    <section className="lounge-card overflow-hidden rounded-[1.35rem]">
      <div className="flex flex-wrap items-center gap-2 border-b border-white/10 px-4 py-2.5">
        <h2 className="inline-flex items-center gap-1.5 text-base font-bold text-white">
          <BriefcaseIcon className="size-4 text-[#C59B27]" />
          구인구직 최신 공고
        </h2>
        <Link href="/boards/jobs" className="more-link ml-auto">
          더보기
        </Link>
      </div>
      <nav aria-label="구인구직 분류" className="card-scroller overflow-x-auto border-b border-white/10 px-4 py-2">
        <ul className="flex w-max gap-1.5">
          {Object.entries(JOB_KINDS).map(([slug, job]) => (
            <li key={slug}>
              <Link
                href={`/boards/jobs/${slug}`}
                className="touch-target inline-flex min-h-9 items-center rounded-full border border-white/12 px-3 text-[13px] font-semibold text-[#E5E7EB] hover:border-[#c9a25c]/60 hover:text-white"
              >
                {job.title}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <PostList posts={jobs} emptyText="아직 올라온 공고가 없습니다." framed={false} compact />
      <div className="grid grid-cols-2 gap-2 border-t border-white/10 p-3">
        <Link
          href="/boards/jobs/write"
          className="touch-target flex min-h-11 items-center justify-center rounded-xl bg-[#8b2222] text-sm font-bold text-white hover:bg-[#a12a2a]"
        >
          구인 등록
        </Link>
        <Link
          href="/boards/jobs/seek/write"
          className="touch-target flex min-h-11 items-center justify-center rounded-xl border border-[#c9a25c]/45 text-sm font-bold text-[#f3eadb] hover:bg-[#2a2017]"
        >
          구직 등록
        </Link>
      </div>
    </section>
  );
}
