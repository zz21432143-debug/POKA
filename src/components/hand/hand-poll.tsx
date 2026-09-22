"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { POLL_CHOICES, pollPercents, type PollChoice } from "@/lib/poll";

export function HandPoll({
  postId,
  initialCounts,
  initialChoice,
}: {
  postId: string;
  initialCounts: Record<string, number>;
  initialChoice: string | null;
}) {
  const [counts, setCounts] = useState(initialCounts);
  const [mine, setMine] = useState<string | null>(initialChoice);
  const [pending, setPending] = useState(false);
  const { total, bars } = pollPercents(counts);

  async function vote(choice: PollChoice) {
    setPending(true);
    try {
      const response = await fetch(`/api/posts/${postId}/poll`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ choice }),
      });
      const payload = (await response.json()) as {
        counts?: Record<string, number>;
        myChoice?: string;
        error?: string;
      };
      if (!response.ok) throw new Error(payload.error);
      if (payload.counts) setCounts(payload.counts);
      if (payload.myChoice) setMine(payload.myChoice);
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="rounded-2xl border border-primary/40 bg-card p-4">
      <div className="flex items-end justify-between gap-2">
        <h2 className="text-lg font-semibold">이 핸드라면?</h2>
        <p className="text-xs text-muted-foreground">투표 {total}명</p>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {POLL_CHOICES.map((choice) => (
          <Button
            key={choice.id}
            type="button"
            size="touch"
            variant={mine === choice.id ? "default" : "outline"}
            disabled={pending}
            onClick={() => void vote(choice.id)}
          >
            {choice.label}
          </Button>
        ))}
      </div>
      <ul className="mt-4 grid gap-2">
        {bars.map((bar) => (
          <li key={bar.id}>
            <div className="mb-1 flex justify-between text-xs">
              <span>{bar.label}</span>
              <span className="text-primary">
                {bar.percent}% · {bar.count}
              </span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-[width]"
                style={{ width: `${bar.percent}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
