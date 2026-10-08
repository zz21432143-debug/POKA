"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ThumbsDownIcon, ThumbsUpIcon } from "lucide-react";
import { cn } from "cn";

export function VoteButtons({
  postId,
  upvoteCount,
  downvoteCount,
  initialVote = 0,
}: {
  postId: string;
  upvoteCount: number;
  downvoteCount: number;
  initialVote?: number;
}) {
  const router = useRouter();
  const [up, setUp] = useState(upvoteCount);
  const [down, setDown] = useState(downvoteCount);
  const [mine, setMine] = useState(initialVote);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function vote(value: 1 | -1) {
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/posts/${postId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value }),
      });
      const payload = (await response.json()) as {
        error?: string;
        upvoteCount?: number;
        downvoteCount?: number;
        myVote?: number;
      };
      if (!response.ok) throw new Error(payload.error ?? "추천에 실패했습니다.");
      setUp(payload.upvoteCount ?? up);
      setDown(payload.downvoteCount ?? down);
      setMine(payload.myVote ?? value);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "추천에 실패했습니다.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <button
        type="button"
        className={cn("vote-pill", mine === 1 && "is-on")}
        disabled={pending}
        onClick={() => vote(1)}
      >
        <ThumbsUpIcon />
        추천
        <strong>{up}</strong>
      </button>
      <button
        type="button"
        className={cn("vote-pill", "is-down", mine === -1 && "is-on")}
        disabled={pending}
        onClick={() => vote(-1)}
      >
        <ThumbsDownIcon />
        비추천
        <strong>{down}</strong>
      </button>
      {error ? <p className="vote-error">{error}</p> : null}
    </>
  );
}
