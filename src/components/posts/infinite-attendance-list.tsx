"use client";

import { useEffect, useRef, useState } from "react";
import { AuthorChip, type PublicAuthor } from "@/components/posts/author-chip";
import { Button } from "@/components/ui/button";
import { PAGE_SIZE } from "@/lib/feed";

type AttendanceItem = {
  id: string;
  title: string;
  content: string;
  author: PublicAuthor;
};

type FeedResponse = {
  total: number;
  items: AttendanceItem[];
  nextOffset: number | null;
  error?: string;
};

export function InfiniteAttendanceList({
  initialItems,
  initialTotal,
  initialNextOffset,
}: {
  initialItems: AttendanceItem[];
  initialTotal: number;
  initialNextOffset: number | null;
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
        `/api/feed?key=attendance&offset=${nextOffset}&limit=${PAGE_SIZE}`,
      );
      const payload = (await response.json()) as FeedResponse;
      if (!response.ok) throw new Error(payload.error ?? "출석 목록을 불러오지 못했습니다.");
      setItems((prev) => {
        const seen = new Set(prev.map((row) => row.id));
        return [...prev, ...payload.items.filter((row) => !seen.has(row.id))];
      });
      setNextOffset(payload.nextOffset);
      setTotal(payload.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "출석 목록을 불러오지 못했습니다.");
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

  if (items.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
        아직 오늘 출석한 회원이 없습니다.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-muted-foreground">
        {items.length} / {total}명
      </p>
      <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
        {items.map((row) => (
          <li key={row.id} className="flex min-h-12 items-center gap-3 px-3 py-3">
            <div className="min-w-0 flex-1">
              <AuthorChip author={row.author} anonymous={false} />
              <p className="truncate text-sm text-muted-foreground">{row.content || row.title}</p>
            </div>
          </li>
        ))}
      </ul>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div ref={sentinel} />
      {nextOffset != null ? (
        <Button type="button" size="touch" variant="outline" disabled={pending} onClick={() => void loadMore()}>
          {pending ? "불러오는 중…" : "더 보기"}
        </Button>
      ) : (
        <p className="text-center text-xs text-muted-foreground">마지막 출석입니다.</p>
      )}
    </div>
  );
}
