"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { PostList, type PostSummary } from "@/components/posts/post-list";
import type { DirectCreative } from "@/lib/inventory-policy";
import { cn } from "cn";

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
}: {
  all: PostSummary[];
  free: PostSummary[];
  hands: PostSummary[];
  nativeSponsor?: DirectCreative | null;
}) {
  const [tab, setTab] = useState<Tab>("all");
  const posts = useMemo(() => {
    if (tab === "free") return free;
    if (tab === "hands") return hands;
    return all;
  }, [tab, all, free, hands]);

  return (
    <section className="lounge-card overflow-hidden rounded-[1.35rem]">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-white/10 px-4 py-2.5">
        <h2 className="mr-1 text-base font-bold text-white">커뮤니티 최신글</h2>
        {TABS.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setTab(item.key)}
            className={cn(
              "relative py-1 text-[13px] font-semibold",
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
