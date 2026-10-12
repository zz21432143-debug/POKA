"use client";

import { useState } from "react";
import { ChevronDownIcon } from "lucide-react";
import { cn } from "cn";
import { HandTable } from "@/components/hand/hand-table";
import { formatBb, sittingSeats, type HandReviewData } from "@/lib/hand-review";
import { ActionLog } from "@/components/hand/action-log";

/** 베팅 라인 접기·펼치기 */
function CollapsibleLog({ hand }: { hand: HandReviewData }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="bg-[#1f2126]">
      {open ? <ActionLog hand={hand} /> : null}
      <button
        type="button"
        className="flex min-h-10 w-full items-center justify-center gap-1 text-[12px] text-zinc-400 hover:text-white"
        onClick={() => setOpen((value) => !value)}
      >
        <ChevronDownIcon className={cn("size-4 transition-transform", open ? "rotate-180" : "")} />
        {open ? "베팅 라인 접기" : "베팅 라인 펼치기"}
      </button>
    </div>
  );
}

export function HandViewer({ hand }: { hand: HandReviewData }) {
  const revealable = sittingSeats(hand).some(
    (seat) => !seat.isHero && seat.showCards && seat.cards.length === 2,
  );
  const [reveal, setReveal] = useState(revealable);
  const others = sittingSeats(hand).filter((seat) => !seat.isHero).length;

  return (
    <section className="overflow-hidden rounded-2xl border border-zinc-800 bg-[#141414]">
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 pt-3">
        <p className="text-xs text-zinc-400">
          나 {hand.heroPosition} · {others + 1}인 · 유효 {formatBb(hand.effectiveBb ?? 100)}
        </p>
        {revealable ? (
          <button
            type="button"
            className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/20"
            onClick={() => setReveal((value) => !value)}
          >
            {reveal ? "상대 핸드 가리기" : "상대 핸드 공개"}
          </button>
        ) : (
          <p className="text-[11px] text-zinc-500">상대 핸드는 비공개</p>
        )}
      </div>
      <HandTable hand={hand} revealOpponents={reveal} />
      <ActionLog hand={hand} />
    </section>
  );
}
