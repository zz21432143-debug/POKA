"use client";

import { cn } from "cn";
import {
  ACTION_LABEL,
  STREET_LABEL_KO,
  STREETS,
  formatBb,
  parseCard,
  suitGlyph,
  type HandReviewData,
  type StreetId,
} from "@/lib/hand-review";
import { replayHand, type ReplayStep } from "@/lib/hand-engine";

const NEW_CARDS: Record<StreetId, [number, number]> = { preflop: [0, 0], flop: [0, 3], turn: [3, 4], river: [4, 5] };

/** 작은 카드 글자(A♥). 빨강·검정으로 구분합니다. */
export function MiniCard({ code }: { code: string }) {
  const card = parseCard(code);
  if (!card) return null;
  return (
    <span
      className={cn(
        "inline-flex h-7 min-w-6 items-center justify-center rounded-md bg-white px-1 text-[13px] font-black leading-none shadow-sm",
        card.red ? "text-[#d42a2a]" : "text-zinc-900",
      )}
    >
      {card.rank}
      {suitGlyph(card.suit)}
    </span>
  );
}

function ActionChip({ step }: { step: ReplayStep }) {
  const { action } = step.row;
  const tone =
    action === "fold"
      ? "bg-zinc-700 text-zinc-300"
      : action === "check" || action === "call"
        ? "bg-white text-zinc-900"
        : action === "allin"
          ? "bg-[#d42a2a] text-white"
          : "bg-[#e6b325] text-zinc-900";
  const amount = action === "fold" || action === "check" ? "" : ` ${formatBb(step.amount)}`;
  return (
    <span className={cn("inline-flex min-h-7 items-center rounded-full px-2.5 text-[13px] font-bold", tone)}>
      {ACTION_LABEL[action]}
      {amount}
    </span>
  );
}

/**
 * 베팅 라인. 스트리트마다 새로 깔린 보드 카드와 시작 팟을 보여 주고,
 * 내 액션은 금색으로, 폴드는 흐리게 표시합니다. 마지막에 내 차례면 "나의 선택은?"을 띄웁니다.
 */
export function ActionLog({ hand, compact = false }: { hand: HandReviewData; compact?: boolean }) {
  const state = replayHand(hand);
  const hero = hand.heroPosition;
  const blinds = hand.blinds.map((row) => `${row.actor} ${formatBb(row.amount)}`).join(" · ");
  const streets = STREETS.filter((street) => hand.streets[street].length > 0 || (street === "preflop" && hand.blinds.length > 0));
  const decision = !state.handOver && state.toAct === hero && state.steps.length > 0;
  const toCall = decision ? Math.max(0, state.currentBet - (state.committed[hero] ?? 0)) : 0;

  return (
    <div className={cn("bg-[#1f2126] text-zinc-100", compact ? "px-2 py-2" : "px-3 py-3")}>
      <ol className="grid gap-2.5">
        {streets.map((street) => {
          const steps = state.steps.filter((step) => step.street === street);
          const [from, to] = NEW_CARDS[street];
          const cards = hand.board.slice(from, to);
          return (
            <li key={street} className="overflow-hidden rounded-xl border border-white/10 bg-black/25">
              <div className="flex flex-wrap items-center gap-2 border-b border-white/10 bg-white/[0.04] px-3 py-2">
                <span className="text-sm font-black text-white">{STREET_LABEL_KO[street]}</span>
                {cards.length ? (
                  <span className="flex gap-1" aria-label={`${STREET_LABEL_KO[street]} 카드`}>
                    {cards.map((code) => (
                      <MiniCard key={code} code={code} />
                    ))}
                  </span>
                ) : null}
                <span className="ml-auto rounded-full bg-emerald-900/60 px-2 py-0.5 text-xs font-bold text-emerald-200">
                  팟 {formatBb(state.potAtStart[street] ?? 0)}
                </span>
              </div>
              {street === "preflop" && blinds ? (
                <p className="px-3 pt-2 text-xs text-zinc-400">블라인드 {blinds}</p>
              ) : null}
              <ul className="grid gap-1 px-2 py-2">
                {steps.length === 0 ? <li className="px-1 text-xs text-zinc-500">액션 없음</li> : null}
                {steps.map((step, index) => {
                  const mine = step.row.actor === hero;
                  const fold = step.row.action === "fold";
                  return (
                    <li
                      key={`${street}-${index}`}
                      className={cn(
                        "flex items-center gap-2 rounded-lg px-2 py-1.5",
                        mine ? "bg-[#c9a25c]/15 ring-1 ring-[#c9a25c]/50" : "",
                        fold && !mine ? "opacity-55" : "",
                      )}
                    >
                      <span
                        className={cn(
                          "inline-flex h-7 min-w-12 items-center justify-center rounded-md px-1.5 text-xs font-black",
                          mine ? "bg-[#c9a25c] text-[#1d1611]" : "bg-white/10 text-zinc-200",
                        )}
                      >
                        {mine ? `나 ${step.row.actor}` : step.row.actor}
                      </span>
                      <ActionChip step={step} />
                      {!fold && step.row.action !== "check" ? (
                        <span className="ml-auto text-[11px] text-zinc-500">팟 {formatBb(step.potAfter)}</span>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </li>
          );
        })}
      </ol>
      {decision ? (
        <p className="mt-2.5 rounded-xl border-2 border-[#c9a25c] bg-[#c9a25c]/10 px-3 py-2.5 text-sm font-bold text-[#f3eadb]">
          ❓ 여기서 나({hero})의 선택은?
          <span className="ml-1 font-semibold text-[#e7c98a]">
            {toCall > 0 ? `콜 ${formatBb(Math.min(toCall, state.remaining[hero] ?? toCall))} · ` : ""}팟 {formatBb(state.pot)}
          </span>
        </p>
      ) : null}
    </div>
  );
}
