"use client";

import { cn } from "cn";
import { StoneDot } from "@/components/games/omok-board";
import { yokaiImage, type YokaiSpecies } from "@/lib/yokai";

/** 대국자 칸: 대표 요괴 · 닉네임 · 돌 색 · 차례(금빛) · 남은 시간 · 말풍선 */
export function OmokPlayer({
  name,
  yokai,
  color,
  active,
  label,
  bubble,
  bubbleKey,
  secondsLeft,
  totalSeconds,
  result,
  emote,
}: {
  name: string;
  yokai: { species: YokaiSpecies; stage: number } | null;
  color: 1 | 2;
  active: boolean;
  label?: string;
  bubble?: string | null;
  /** 말풍선이 바뀔 때마다 다시 튀어나오게 */
  bubbleKey?: string | number;
  secondsLeft?: number | null;
  totalSeconds?: number;
  result?: "win" | "lose" | null;
  emote?: string | null;
}) {
  const ratio =
    secondsLeft != null && totalSeconds
      ? Math.max(0, Math.min(1, secondsLeft / totalSeconds))
      : null;
  return (
    <div
      data-omok-player={color === 1 ? "b" : "w"}
      data-active={active ? "1" : undefined}
      className={cn(
        "relative flex min-h-16 items-center gap-2 rounded-2xl border border-white/10 bg-black/40 px-2 py-1.5 transition",
        active && "omok-turn border-[#f5c451]/70",
        result === "win" && "border-[#f5c451] bg-[#3a2a08]/60",
        result === "lose" && "opacity-70",
      )}
    >
      <div className="relative size-14 shrink-0">
        {yokai ? (
          // eslint-disable-next-line @next/next/no-img-element -- 요괴 픽셀 그림
          <img
            src={yokaiImage(yokai.species, yokai.stage)}
            alt=""
            className={cn(
              "size-full object-contain",
              result === "lose" && "grayscale",
            )}
            draggable={false}
          />
        ) : (
          <span
            className="grid size-full place-items-center text-3xl"
            aria-hidden
          >
            👤
          </span>
        )}
        {emote ? (
          <span
            key={String(bubbleKey)}
            className="omok-bubble-pop absolute -top-2 -right-2 text-2xl drop-shadow"
            aria-label={`이모티콘 ${emote}`}
          >
            {emote}
          </span>
        ) : null}
      </div>
      <div className="grid min-w-0 flex-1 gap-0.5">
        <div className="flex min-w-0 items-center gap-1.5">
          <StoneDot color={color} />
          <b className="truncate text-sm font-black text-white">{name}</b>
          {label ? (
            <span className="shrink-0 rounded-full border border-white/15 px-1.5 text-[10px] font-bold text-zinc-300">
              {label}
            </span>
          ) : null}
          {result === "win" ? (
            <span className="shrink-0 text-xs font-black text-[#f5c451]">
              🏆 승리
            </span>
          ) : null}
        </div>
        {bubble ? (
          <p
            key={String(bubbleKey)}
            data-omok-bubble
            className="omok-bubble-pop w-fit max-w-full rounded-xl rounded-tl-sm bg-[#f6efe2] px-2 py-0.5 text-xs font-bold text-[#2a1a10]"
          >
            {bubble}
          </p>
        ) : (
          <p className="text-xs text-zinc-400">{active ? "생각 중…" : " "}</p>
        )}
        {ratio !== null ? (
          <div
            className="flex items-center gap-1.5"
            aria-label={`남은 시간 ${secondsLeft}초`}
          >
            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
              <span
                className={cn(
                  "block h-full rounded-full transition-[width] duration-500",
                  ratio > 0.33 ? "bg-[#f5c451]" : "bg-rose-500",
                )}
                style={{ width: `${ratio * 100}%` }}
              />
            </span>
            <span
              className={cn(
                "w-7 text-right text-[11px] font-black tabular-nums",
                ratio > 0.33 ? "text-zinc-300" : "text-rose-400",
              )}
            >
              {secondsLeft}
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
