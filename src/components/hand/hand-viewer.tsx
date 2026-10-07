"use client";

import { useState } from "react";
import { ChevronDownIcon } from "lucide-react";
import { cn } from "cn";
import { HandTable } from "@/components/hand/hand-table";
import {
  ACTION_LABEL,
  actionChipClass,
  actionTimeline,
  actorLabel,
  formatBb,
  sittingSeats,
  type HandReviewData,
  type StreetAction,
} from "@/lib/hand-review";

function ActionRow({ row, hand }: { row: StreetAction; hand: HandReviewData }) {
  return (
    <li className="flex items-center justify-between gap-2 py-1">
      <span className="text-[13px] font-medium text-zinc-200">{actorLabel(row.actor, hand)}</span>
      <span className={cn("rounded-md px-2 py-0.5 text-[12px] font-bold", actionChipClass(row.action))}>
        {ACTION_LABEL[row.action]}
        {row.amount != null ? ` ${formatBb(row.amount)}` : ""}
      </span>
    </li>
  );
}

function ActionLog({ hand }: { hand: HandReviewData }) {
  const [open, setOpen] = useState(true);
  const groups = actionTimeline(hand).filter((group) => group.street === "blinds" || group.rows.length > 0);

  return (
    <div className="bg-[#2a2d33] text-zinc-100">
      {open ? (
        <ol className="grid gap-3 px-3 py-3">
          {groups.map((group) => (
            <li key={group.street}>
              <div className="mb-1 flex items-baseline justify-between gap-2">
                <p className="text-[12px] font-semibold text-zinc-300">{group.label}</p>
                {group.pot != null ? (
                  <p className="text-[11px] text-zinc-500">팟 {formatBb(group.pot)}</p>
                ) : null}
              </div>
              {group.street === "blinds" ? (
                <p className="text-[13px] text-zinc-200">
                  {group.rows.map((row) => `${row.actor} ${formatBb(row.amount)}`).join(" · ")}
                </p>
              ) : group.rows.length === 0 ? (
                <p className="text-[12px] text-zinc-500">액션 없음</p>
              ) : (
                <ul>
                  {group.rows.map((row, index) => (
                    <ActionRow key={`${group.street}-${index}`} row={row} hand={hand} />
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ol>
      ) : null}
      <button
        type="button"
        className="flex w-full items-center justify-center gap-1 py-2 text-[12px] text-zinc-400 hover:text-white"
        onClick={() => setOpen((value) => !value)}
      >
        <ChevronDownIcon className={cn("size-4 transition-transform", open ? "rotate-180" : "")} />
        {open ? "액션 접기" : "액션 펼치기"}
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
