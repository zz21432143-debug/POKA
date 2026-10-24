"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { POLL_CHOICES, pollPercents, type PollChoice } from "@/lib/poll";

export function HandPoll({
  postId,
  initialCounts,
  initialChoice,
  compact = false,
}: {
  postId: string;
  initialCounts: Record<string, number>;
  initialChoice: string | null;
  /** 홈 등 좁은 칸: 투표 전에는 결과 막대를 숨김 */
  compact?: boolean;
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
    <section className="ink-panel rounded-2xl p-4">
      <div className="flex items-end justify-between gap-2">
        <h2 className="text-lg font-bold text-white">이 핸드라면?</h2>
        <p className="text-xs text-[#9CA3AF]">투표 {total}명</p>
      </div>
      <div className={compact ? "mt-3 grid grid-cols-2 gap-2" : "mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4"}>
        {POLL_CHOICES.map((choice) => (
          <Button
            key={choice.id}
            type="button"
            size="touch"
            variant={mine === choice.id ? "default" : "outline"}
            className={mine === choice.id ? "ink-on" : "ink-btn"}
            disabled={pending}
            onClick={() => void vote(choice.id)}
          >
            {choice.label}
          </Button>
        ))}
      </div>
      {compact && !mine ? (
        <p className="mt-2 text-xs text-[#9CA3AF]">투표하면 다른 사람 선택이 보여요.</p>
      ) : (
      <ul className="mt-4 grid gap-2">
        {bars.map((bar) => (
          <li key={bar.id}>
            <div className="mb-1 flex justify-between text-xs text-white">
              <span>{bar.label}</span>
              <span className="font-semibold text-[#C59B27]">
                {bar.percent}% · {bar.count}
              </span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-[#2a2224]">
              <div
                className="h-full rounded-full bg-[#C59B27] transition-[width]"
                style={{ width: `${bar.percent}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
      )}
    </section>
  );
}
