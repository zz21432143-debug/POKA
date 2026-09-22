"use client";

import { Fragment, useMemo, useState } from "react";
import Link from "next/link";
import { PostList, type PostSummary } from "@/components/posts/post-list";
import { cn } from "cn";
import { SponsoredPostLine } from "@/components/ads/sponsored-post-line";

const TABS = [
  { key: "all", label: "전체" },
  { key: "free", label: "자유" },
  { key: "jobs", label: "구인/구직" },
  { key: "tips", label: "노하우" },
  { key: "issues", label: "이슈" },
] as const;

type Tab = (typeof TABS)[number]["key"];

export function HomeLatest({
  all,
  free,
  jobs,
  issues,
  tips,
}: {
  all: PostSummary[];
  free: PostSummary[];
  jobs: PostSummary[];
  issues: PostSummary[];
  tips: { title: string; href: string; hint: string }[];
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
        <h2 className="mr-2 text-base font-semibold">최신 게시글</h2>
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
        <Link href="/boards/free" className="ml-auto text-xs text-muted-foreground hover:text-primary">
          더보기
        </Link>
      </div>
      {tab === "tips" ? (
        <ul className="divide-y divide-border">
          {tips.map((row, index) => (
            <Fragment key={row.title}>
              {index === 3 ? <SponsoredPostLine /> : null}
              <li>
                <Link href={row.href} className="touch-target flex min-h-14 items-center gap-3 px-4 py-3 hover:bg-muted/50">
                  <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700">
                    노하우
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{row.title}</span>
                  <span className="hidden text-xs text-muted-foreground sm:inline">{row.hint}</span>
                </Link>
              </li>
            </Fragment>
          ))}
        </ul>
      ) : (
        <PostList posts={posts} emptyText="아직 게시글이 없습니다." showBoard framed={false} />
      )}
    </section>
  );
}
