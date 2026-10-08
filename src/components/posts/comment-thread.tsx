"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AuthorChip, type PublicAuthor } from "@/components/posts/author-chip";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BEST_COMMENT_MIN } from "@/lib/rewards";
import { ReportButton } from "@/components/posts/report-button";

export type CommentRow = {
  id: string;
  content: string;
  upvoteCount: number;
  author: PublicAuthor;
  liked?: boolean;
};

export function CommentThread({
  comments,
  anonymous,
}: {
  comments: CommentRow[];
  anonymous: boolean;
}) {
  if (comments.length === 0) {
    return <p className="text-sm text-muted-foreground">아직 댓글이 없습니다.</p>;
  }

  const max = Math.max(...comments.map((row) => row.upvoteCount), 0);
  const ordered = [...comments].sort((a, b) => {
    const aBest = a.upvoteCount >= BEST_COMMENT_MIN || (a.upvoteCount > 0 && a.upvoteCount === max);
    const bBest = b.upvoteCount >= BEST_COMMENT_MIN || (b.upvoteCount > 0 && b.upvoteCount === max);
    if (aBest !== bBest) return aBest ? -1 : 1;
    return b.upvoteCount - a.upvoteCount;
  });

  return (
    <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
      {ordered.map((row) => (
        <CommentItem
          key={row.id}
          comment={row}
          anonymous={anonymous}
          best={
            row.upvoteCount > 0 &&
            (row.upvoteCount >= BEST_COMMENT_MIN || row.upvoteCount === max)
          }
        />
      ))}
    </ul>
  );
}

function CommentItem({
  comment,
  anonymous,
  best = false,
}: {
  comment: CommentRow;
  anonymous: boolean;
  best?: boolean;
}) {
  const router = useRouter();
  const [count, setCount] = useState(comment.upvoteCount);
  const [liked, setLiked] = useState(Boolean(comment.liked));
  const [pending, setPending] = useState(false);

  async function like() {
    setPending(true);
    try {
      const response = await fetch(`/api/comments/${comment.id}/vote`, { method: "POST" });
      const payload = (await response.json()) as { error?: string; upvoteCount?: number };
      if (!response.ok) throw new Error(payload.error ?? "추천에 실패했습니다.");
      setCount(payload.upvoteCount ?? count + 1);
      setLiked(true);
      router.refresh();
    } catch {
      /* 메시지는 버튼 비활성으로 충분 */
    } finally {
      setPending(false);
    }
  }

  return (
    <li
      className={
        best
          ? "border-b border-primary/30 bg-primary/10 px-3 py-3"
          : "px-3 py-3"
      }
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          {best ? <Badge>베스트 댓글</Badge> : null}
          <AuthorChip author={comment.author} anonymous={anonymous} size="sm" />
          <span className="text-xs text-primary">추천 {count}</span>
        </div>
        <Button
          type="button"
          size="touch"
          variant={liked ? "default" : "outline"}
          disabled={pending || liked}
          onClick={() => void like()}
        >
          추천
        </Button>
        <ReportButton targetType="comment" targetId={comment.id} compact />
      </div>
      <p className="mt-1 break-words text-sm whitespace-pre-wrap">{comment.content}</p>
    </li>
  );
}
