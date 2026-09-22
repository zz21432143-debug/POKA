"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

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
    <div className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        size="touch"
        variant={mine === 1 ? "default" : "outline"}
        disabled={pending}
        onClick={() => vote(1)}
      >
        추천 {up}
      </Button>
      <Button
        type="button"
        size="touch"
        variant={mine === -1 ? "secondary" : "outline"}
        disabled={pending}
        onClick={() => vote(-1)}
      >
        비추 {down}
      </Button>
      {error ? <span className="text-sm text-destructive">{error}</span> : null}
    </div>
  );
}
