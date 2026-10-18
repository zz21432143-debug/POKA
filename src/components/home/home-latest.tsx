"use client";

import { useMemo, useState } from "react";
import Link from "@/components/ui/link";
import { PostList, type PostSummary } from "@/components/posts/post-list";
import type { DirectCreative } from "@/lib/inventory-policy";
import { cn } from "cn";
import { POST_POINTS } from "@/lib/rewards";

const TABS = [
  { key: "all", label: "전체", href: "/community" },
  { key: "free", label: "자유", href: "/boards/free" },
  { key: "hands", label: "핸드리뷰", href: "/boards/hand-review" },
] as const;

type Tab = (typeof TABS)[number]["key"];

export function HomeLatest({
  all,
  free,
  hands,
  nativeSponsor = null,
  firstBonus = null,
}: {
  all: PostSummary[];
  free: PostSummary[];
  hands: PostSummary[];
  nativeSponsor?: DirectCreative | null;
  /** 첫 글 보너스 포인트(아직 안 받은 회원만) */
  firstBonus?: number | null;
}) {
  const [tab, setTab] = useState<Tab>("all");
  const posts = useMemo(() => {
    if (tab === "free") return free;
    if (tab === "hands") return hands;
    return all;
  }, [tab, all, free, hands]);

  return (
    <section className="lounge-card overflow-hidden rounded-[1.35rem]">
      <div className="flex items-center gap-x-3 border-b border-white/10 px-4 py-2.5">
        <h2 className="mr-1 shrink-0 whitespace-nowrap text-base font-bold text-white">
          <span className="hidden sm:inline">커뮤니티 </span>최신글
        </h2>
        {TABS.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setTab(item.key)}
            className={cn(
              "touch-target relative min-h-11 px-1.5 text-[13px] font-semibold",
              tab === item.key ? "text-white" : "text-[#9CA3AF] hover:text-[#E5E7EB]",
            )}
          >
            {item.label}
            {tab === item.key ? (
              <span className="absolute inset-x-0 -bottom-0.5 h-0.5 rounded-full bg-primary" />
            ) : null}
          </button>
        ))}
        <Link
          href={TABS.find((item) => item.key === tab)?.href ?? "/community"}
          className="more-link ml-auto"
        >
          더보기
        </Link>
      </div>
      {/* 회원 글 늘리기: 바로 쓰러 가기(첫 글이면 보너스 안내) */}
      <Link
        href={tab === "hands" ? "/boards/hand-review/write" : "/boards/free/write"}
        data-home-write
        className="flex min-h-11 items-center gap-2 border-b border-white/10 bg-[#c9a25c]/10 px-4 text-sm font-bold text-[#f3d9a4] hover:bg-[#c9a25c]/20"
      >
        <span aria-hidden>✍️</span>
        <span className="min-w-0 flex-1 truncate">
          {firstBonus ? (
            <>
              첫 글 쓰면 <b className="text-[#ffcf4a]">+{firstBonus}P</b> 보너스 · {tab === "hands" ? "핸드 하나 올려 보기" : "오늘 매장 이야기 한 줄"}
            </>
          ) : tab === "hands" ? (
            `핸드 올리고 의견 받기 · +${POST_POINTS.HAND_REVIEW}P`
          ) : (
            `오늘 있었던 일 · 궁금한 것 한 줄 · +${POST_POINTS.FREE}P`
          )}
        </span>
        <span className="shrink-0 text-xs">글쓰기 ›</span>
      </Link>
      <PostList
        posts={posts}
        emptyText="아직 게시글이 없습니다."
        showBoard
        framed={false}
        compact
        nativeSponsor={nativeSponsor}
      />
    </section>
  );
}
