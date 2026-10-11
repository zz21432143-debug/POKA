import Link from "next/link";
import { BriefcaseIcon, ChevronRightIcon } from "lucide-react";
import { PostList, type PostSummary } from "@/components/posts/post-list";

/** 홈에는 모집중 최신 공고 5개만. 분류·지역 필터는 구인구직 홈에서 봅니다. */
export function HomeJobs({ jobs }: { jobs: PostSummary[] }) {
  return (
    <section className="lounge-card overflow-hidden rounded-[1.35rem]">
      <div className="flex flex-wrap items-center gap-2 border-b border-white/10 px-4 py-2.5">
        <h2 className="inline-flex items-center gap-1.5 text-base font-bold text-white">
          <BriefcaseIcon className="size-4 text-[#C59B27]" />
          구인구직 최신 공고
        </h2>
        <Link href="/boards/jobs?open=1" className="more-link ml-auto">
          더보기
        </Link>
      </div>
      <PostList
        posts={jobs}
        emptyText="지금 모집중인 공고가 없습니다."
        framed={false}
        compact
        emptyAction={{ href: "/boards/jobs/write", label: "첫 공고 올리기" }}
      />
      <Link
        href="/boards/jobs"
        className="touch-target flex min-h-11 items-center justify-center gap-1 border-t border-white/10 text-sm font-bold text-[#e7c98a] hover:bg-[#2a2017]"
      >
        지역별 · 분류별 공고 보기
        <ChevronRightIcon className="size-4" />
      </Link>
    </section>
  );
}
