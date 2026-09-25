"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { PostList, type PostSummary } from "@/components/posts/post-list";
import type { DirectCreative } from "@/lib/inventory-policy";
import { cn } from "cn";

const TABS = [
  { key: "all", label: "전체", href: "/community" },
  { key: "free", label: "자유", href: "/boards/free" },
  { key: "jobs", label: "구인/구직", href: "/boards/jobs" },
  { key: "issues", label: "이슈", href: "/issues" },
] as const;

type Tab = (typeof TABS)[number]["key"];

export function HomeLatest({
  all,
  free,
  jobs,
  issues,
  nativeSponsor = null,
}: {
  all: PostSummary[];
  free: PostSummary[];
  jobs: PostSummary[];
  issues: PostSummary[];
  nativeSponsor?: DirectCreative | null;
}) {
  const [tab, setTab] = useState<Tab>("all");
  const posts = useMemo(() => {
    if (tab === "free") return free;
    if (tab === "jobs") return jobs;
    if (tab === "issues") return issues;
    return all;
  }, [tab, all, free, jobs, issues]);

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
        <h2 className="mr-2 text-lg font-bold sm:text-xl">최신 게시글</h2>
        {TABS.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setTab(item.key)}
            className={cn(
              "rounded-full px-2.5 py-1 text-xs font-medium",
              tab === item.key ? "bg-primary text-white" : "text-muted-foreground hover:bg-muted",
            )}
          >
            {item.label}
          </button>
        ))}
        <Link
          href={TABS.find((item) => item.key === tab)?.href ?? "/community"}
          className="ml-auto text-xs text-muted-foreground hover:text-primary"
        >
          더보기
        </Link>
      </div>
      <PostList
        posts={posts}
        emptyText="아직 게시글이 없습니다."
        showBoard
        framed={false}
        nativeSponsor={nativeSponsor}
      />
    </section>
  );
}
