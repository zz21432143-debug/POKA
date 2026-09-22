"use client";

import { useState } from "react";
import { ChevronDownIcon } from "lucide-react";
import { cn } from "cn";
import { HandTable } from "@/components/hand/hand-table";
import {
  ACTION_LABEL,
  STREET_LABEL,
  actionChipClass,
  formatBb,
  resolveActorSeat,
  sittingSeats,
  type HandReviewData,
  type StreetAction,
} from "@/lib/hand-review";

function ActionPill({ row, hand }: { row: StreetAction; hand: HandReviewData }) {
  const seat = resolveActorSeat(row.actor, hand);
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-[10px] font-semibold text-zinc-400">{seat}</span>
      <span className={cn("rounded-md px-2 py-1 text-center text-[11px] font-bold", actionChipClass(row.action))}>
        {ACTION_LABEL[row.action]}
        {row.amount != null ? ` ${formatBb(row.amount)}` : ""}
      </span>
    </div>
  );
}

function ActionLog({ hand }: { hand: HandReviewData }) {
  const [open, setOpen] = useState(true);
  const columns = [
    { key: "blinds", label: "Blinds (Ante)", pot: null as number | undefined, rows: hand.blinds },
    { key: "preflop", label: STREET_LABEL.preflop, pot: hand.streetPots?.preflop, rows: hand.streets.preflop },
    { key: "flop", label: STREET_LABEL.flop, pot: hand.streetPots?.flop, rows: hand.streets.flop },
    { key: "turn", label: STREET_LABEL.turn, pot: hand.streetPots?.turn, rows: hand.streets.turn },
    { key: "river", label: STREET_LABEL.river, pot: hand.streetPots?.river ?? hand.potBb, rows: hand.streets.river },
  ];

  return (
    <div className="bg-[#2a2d33] text-zinc-100">
      {open ? (
        <div className="grid grid-cols-5 gap-1 overflow-x-auto p-2 sm:p-3">
          {columns.map((col) => (
            <div key={col.key} className="min-w-[4.5rem]">
              <p className="text-center text-[11px] font-semibold text-zinc-300">{col.label}</p>
              {col.pot != null ? (
                <p className="mt-0.5 text-center text-[10px] text-zinc-500">{formatBb(col.pot)}</p>
              ) : (
                <p className="mt-0.5 text-center text-[10px] text-transparent">.</p>
              )}
              <div className="mt-2 flex flex-col items-center gap-2">
                {col.rows.length === 0 ? (
                  <span className="text-[10px] text-zinc-500">-</span>
                ) : (
                  col.rows.map((row, index) => (
                    <ActionPill key={`${col.key}-${index}`} row={row} hand={hand} />
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      ) : null}
      <button
        type="button"
        className="flex w-full items-center justify-center gap-1 py-2 text-[12px] text-zinc-400 hover:text-white"
        onClick={() => setOpen((value) => !value)}
      >
        <ChevronDownIcon className={cn("size-4 transition-transform", open ? "rotate-180" : "")} />
        {open ? "접기" : "액션 로그 펼치기"}
      </button>
    </div>
  );
}

export function HandViewer({ hand }: { hand: HandReviewData }) {
  const revealable = sittingSeats(hand).some(
    (seat) => !seat.isHero && seat.showCards && seat.cards.length === 2,
  );
  const [reveal, setReveal] = useState(revealable);

  return (
    <section className="overflow-hidden rounded-2xl border border-zinc-800 bg-[#141414]">
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 pt-3">
        <p className="text-xs text-zinc-400">
          {hand.heroPosition} Hero · 유효 {formatBb(hand.effectiveBb ?? 100)}
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
          <p className="text-[11px] text-zinc-500">상대 핸드는 공개되지 않았습니다</p>
        )}
      </div>
      <HandTable hand={hand} revealOpponents={reveal} />
      <ActionLog hand={hand} />
    </section>
  );
}
