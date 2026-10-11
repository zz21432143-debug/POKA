import Link from "next/link";
import { BriefcaseIcon, ChevronRightIcon } from "lucide-react";
import { PostList, type PostSummary } from "@/components/posts/post-list";

/** 홈 메인 공고. 사이트의 중심인 지원 딜러 구인 중 모집중인 최신 5개를 보여줍니다. */
export function HomeJobs({ jobs }: { jobs: PostSummary[] }) {
  return (
    <section className="lounge-card overflow-hidden rounded-[1.35rem]">
      <div className="flex flex-wrap items-center gap-2 border-b border-white/10 px-4 py-2.5">
        <h2 className="inline-flex items-center gap-1.5 text-base font-bold text-white">
          <BriefcaseIcon className="size-4 text-[#C59B27]" />
          지원 딜러 구인
        </h2>
        <Link href="/boards/jobs/apply?open=1" className="more-link ml-auto">
          더보기
        </Link>
      </div>
      <PostList
        posts={jobs}
        emptyText="지금 모집중인 지원 딜러 공고가 없습니다."
        framed={false}
        compact
        emptyAction={{ href: "/boards/jobs/apply/write", label: "지원 딜러 구인 올리기" }}
      />
      <Link
        href="/boards/jobs"
        className="touch-target flex min-h-11 items-center justify-center gap-1 border-t border-white/10 text-sm font-bold text-[#e7c98a] hover:bg-[#2a2017]"
      >
        지역별 · 분류별 전체 공고 보기
        <ChevronRightIcon className="size-4" />
      </Link>
    </section>
  );
}
