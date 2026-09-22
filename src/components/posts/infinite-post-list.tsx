"use client";

import { useEffect, useRef, useState } from "react";
import { PostList, type PostSummary } from "@/components/posts/post-list";
import { Button } from "@/components/ui/button";
import { PAGE_SIZE } from "@/lib/feed";

type FeedResponse = {
  total: number;
  items: PostSummary[];
  nextOffset: number | null;
  error?: string;
};

export function InfinitePostList({
  feedKey,
  initialItems,
  initialTotal,
  initialNextOffset,
  emptyText,
  showBoard = false,
}: {
  feedKey: string;
  initialItems: PostSummary[];
  initialTotal: number;
  initialNextOffset: number | null;
  emptyText: string;
  showBoard?: boolean;
}) {
  const [items, setItems] = useState(initialItems);
  const [nextOffset, setNextOffset] = useState(initialNextOffset);
  const [total, setTotal] = useState(initialTotal);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sentinel = useRef<HTMLDivElement>(null);

  async function loadMore() {
    if (pending || nextOffset == null) return;
    setPending(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/feed?key=${encodeURIComponent(feedKey)}&offset=${nextOffset}&limit=${PAGE_SIZE}`,
      );
      const payload = (await response.json()) as FeedResponse;
      if (!response.ok) throw new Error(payload.error ?? "목록을 불러오지 못했습니다.");
      setItems((prev) => {
        const seen = new Set(prev.map((row) => row.id));
        return [...prev, ...payload.items.filter((row) => !seen.has(row.id))];
      });
      setNextOffset(payload.nextOffset);
      setTotal(payload.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "목록을 불러오지 못했습니다.");
    } finally {
      setPending(false);
    }
  }

  useEffect(() => {
    const node = sentinel.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void loadMore();
      },
      { rootMargin: "240px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nextOffset, pending]);

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-muted-foreground">
        {items.length} / {total}개
      </p>
      <PostList posts={items} emptyText={emptyText} showBoard={showBoard} />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div ref={sentinel} />
      {nextOffset != null ? (
        <Button type="button" size="touch" variant="outline" disabled={pending} onClick={() => void loadMore()}>
          {pending ? "불러오는 중…" : "더 보기"}
        </Button>
      ) : items.length > 0 ? (
        <p className="text-center text-xs text-muted-foreground">마지막 글입니다.</p>
      ) : null}
    </div>
  );
}
