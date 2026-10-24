"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AuthorChip, type PublicAuthor } from "@/components/posts/author-chip";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BEST_COMMENT_MIN } from "@/lib/rewards";
import { ReportButton } from "@/components/posts/report-button";
import { ACCEPT_POINTS } from "@/lib/accept-answer";

export type CommentRow = {
  id: string;
  content: string;
  upvoteCount: number;
  author: PublicAuthor;
  liked?: boolean;
  /** 글쓴이가 「좋은 답변」으로 채택함 */
  accepted?: boolean;
  /** 내가 글쓴이이고 채택할 수 있는 댓글(남의 댓글 · 아직 채택 없음) */
  acceptable?: boolean;
};

export function CommentThread({
  comments,
  anonymous,
}: {
  comments: CommentRow[];
  anonymous: boolean;
}) {
  if (comments.length === 0) {
    return (
      <p className="rounded-xl border border-[#3a332c] bg-[#141110] px-4 py-6 text-center text-sm text-[#D1D5DB]">
        아직 댓글이 없습니다.
      </p>
    );
  }

  const max = Math.max(...comments.map((row) => row.upvoteCount), 0);
  const ordered = [...comments].sort((a, b) => {
    // 채택된 답변이 맨 위
    if (Boolean(a.accepted) !== Boolean(b.accepted)) return a.accepted ? -1 : 1;
    const aBest = a.upvoteCount >= BEST_COMMENT_MIN || (a.upvoteCount > 0 && a.upvoteCount === max);
    const bBest = b.upvoteCount >= BEST_COMMENT_MIN || (b.upvoteCount > 0 && b.upvoteCount === max);
    if (aBest !== bBest) return aBest ? -1 : 1;
    return b.upvoteCount - a.upvoteCount;
  });

  return (
    <ul className="divide-y divide-[#3a332c] overflow-hidden rounded-xl border border-[#3a332c] bg-[#141110]">
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
  const [acceptError, setAcceptError] = useState<string | null>(null);

  async function accept() {
    if (!window.confirm(`이 댓글을 좋은 답변으로 채택할까요?\n글 하나에 한 번만 할 수 있고 되돌릴 수 없어요. 답변자에게 +${ACCEPT_POINTS}P가 가요.`)) return;
    setPending(true);
    setAcceptError(null);
    try {
      const response = await fetch(`/api/comments/${comment.id}/accept`, { method: "POST" });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "채택에 실패했습니다.");
      router.refresh();
    } catch (err) {
      setAcceptError(err instanceof Error ? err.message : "채택에 실패했습니다.");
    } finally {
      setPending(false);
    }
  }

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
      data-comment-accepted={comment.accepted ? "" : undefined}
      className={
        comment.accepted
          ? "border-l-4 border-emerald-500 bg-emerald-950/40 px-3 py-3.5"
          : best
            ? "border-b border-[#8B2222]/60 bg-[#2a1818] px-3 py-3.5"
            : "bg-[#1C1819] px-3 py-3.5"
      }
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          {comment.accepted ? (
            <span className="shrink-0 whitespace-nowrap rounded-full bg-emerald-500 px-2 py-0.5 text-xs font-black text-black">✅ 채택</span>
          ) : best ? (
            <Badge>베스트 댓글</Badge>
          ) : null}
          <AuthorChip author={comment.author} anonymous={anonymous} size="sm" />
          <span className="text-xs font-medium text-[#C59B27]">추천 {count}</span>
        </div>
        <Button
          type="button"
          size="touch"
          variant={liked ? "default" : "outline"}
          className={liked ? "ink-on" : "ink-btn"}
          disabled={pending || liked}
          onClick={() => void like()}
        >
          추천
        </Button>
        {comment.acceptable ? (
          <button
            type="button"
            data-accept-comment
            disabled={pending}
            onClick={() => void accept()}
            className="min-h-11 rounded-lg border border-emerald-500/70 px-3 text-sm font-black text-emerald-300 hover:bg-emerald-950 disabled:opacity-50"
          >
            채택
          </button>
        ) : null}
        <ReportButton targetType="comment" targetId={comment.id} compact />
      </div>
      {acceptError ? <p className="mt-1 text-xs text-rose-300">{acceptError}</p> : null}
      <p className="mt-2 break-words text-[15px] leading-7 whitespace-pre-wrap text-[#E5E7EB]">
        {comment.content}
      </p>
    </li>
  );
}
