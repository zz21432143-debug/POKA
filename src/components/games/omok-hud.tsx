"use client";

import { cn } from "cn";
import { StoneDot } from "@/components/games/omok-board";
import { yokaiImage, type YokaiSpecies } from "@/lib/yokai";

export type HudSeat = {
  name: string;
  yokai: { species: YokaiSpecies; stage: number } | null;
  color: 1 | 2;
  /** 1P · 2P · YOU · CPU */
  tag: string;
  /** 「3승 1패 1기권」 */
  record?: string | null;
  active: boolean;
  secondsLeft?: number | null;
  totalSeconds?: number;
  bubble?: { text: string; key: number | string } | null;
  emote?: { e: string; key: number | string } | null;
  result?: "win" | "lose" | null;
  /** 아직 아무도 안 앉은 자리 */
  empty?: boolean;
};

/** 격투 게임 같은 위 HUD: 왼쪽 명판 · VS · 오른쪽 명판(거울) */
export function OmokHud({ left, right }: { left: HudSeat; right: HudSeat }) {
  return (
    <div
      data-omok-hud
      className="relative grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-start gap-1.5"
    >
      <Plate seat={left} side="left" />
      <span className="vs-badge self-center pt-1 text-lg" aria-hidden>
        VS
      </span>
      <Plate seat={right} side="right" />
    </div>
  );
}

function Plate({ seat, side }: { seat: HudSeat; side: "left" | "right" }) {
  const ratio =
    seat.secondsLeft != null && seat.totalSeconds
      ? Math.max(0, Math.min(1, seat.secondsLeft / seat.totalSeconds))
      : null;
  const right = side === "right";
  return (
    <div
      data-omok-player={seat.color === 1 ? "b" : "w"}
      data-active={seat.active ? "1" : undefined}
      className={cn(
        "hud-plate relative grid gap-1 p-1.5",
        seat.result === "lose" && "opacity-75",
      )}
    >
      <div
        className={cn(
          "flex min-w-0 items-center gap-1.5",
          right && "flex-row-reverse",
        )}
      >
        <div
          className={cn(
            "hud-portrait relative size-12 shrink-0 overflow-hidden",
            seat.active && "arcade-bob",
          )}
        >
          {seat.empty ? (
            <span className="arcade-px arcade-blink grid size-full place-items-center text-xl text-[#ffe08a]">
              ?
            </span>
          ) : seat.yokai ? (
            // eslint-disable-next-line @next/next/no-img-element -- 요괴 픽셀 그림
            <img
              src={yokaiImage(seat.yokai.species, seat.yokai.stage)}
              alt=""
              draggable={false}
              className={cn(
                "size-full object-contain",
                right && "-scale-x-100",
                seat.result === "lose" && "grayscale",
              )}
            />
          ) : (
            <span
              className="grid size-full place-items-center text-2xl"
              aria-hidden
            >
              👤
            </span>
          )}
        </div>
        <div className={cn("grid min-w-0 flex-1", right && "text-right")}>
          <div
            className={cn(
              "flex min-w-0 items-center gap-1",
              right && "flex-row-reverse",
            )}
          >
            <span
              className={cn(
                "arcade-px shrink-0 text-[8px]",
                seat.tag === "YOU"
                  ? "neon-cyan"
                  : seat.tag === "CPU"
                    ? "neon-purple"
                    : "neon-gold",
              )}
            >
              {seat.tag}
            </span>
            <StoneDot color={seat.color} className="size-3" />
          </div>
          <b className="truncate text-[13px] leading-tight font-black text-white">
            {seat.empty ? "기다리는 중…" : seat.name}
          </b>
          {seat.record ? (
            <span
              data-omok-record
              className="truncate text-[10px] leading-tight font-bold text-[#e7c98a]"
            >
              {seat.record}
            </span>
          ) : null}
        </div>
      </div>
      {ratio !== null ? (
        <div
          className={cn("flex items-center gap-1", right && "flex-row-reverse")}
          aria-label={`남은 시간 ${seat.secondsLeft}초`}
        >
          <div
            className={cn("hud-bar flex-1", right && "-scale-x-100")}
            data-low={ratio <= 0.33 ? "1" : undefined}
          >
            <span style={{ width: `${ratio * 100}%` }} />
          </div>
          <span
            className={cn(
              "arcade-px w-5 text-[8px]",
              ratio <= 0.33 ? "neon-red" : "text-zinc-200",
              right ? "text-left" : "text-right",
            )}
          >
            {seat.secondsLeft}
          </span>
        </div>
      ) : (
        <div className="hud-bar opacity-30">
          <span style={{ width: seat.active ? "100%" : "0%" }} />
        </div>
      )}
      {seat.result === "win" ? (
        <span className="arcade-px neon-gold arcade-pop absolute -top-2 left-1/2 -translate-x-1/2 text-[9px]">
          WIN
        </span>
      ) : null}
      {seat.emote ? (
        <span
          key={seat.emote.key}
          className="arcade-pop absolute -top-3 z-40 text-2xl drop-shadow"
          style={right ? { left: 4 } : { right: 4 }}
          aria-label={`이모티콘 ${seat.emote.e}`}
        >
          {seat.emote.e}
        </span>
      ) : null}
      {seat.bubble ? (
        <p
          key={seat.bubble.key}
          data-omok-bubble
          className={cn(
            "omok-bubble-pop pointer-events-none absolute top-full z-40 mt-1 max-w-[150%] rounded-lg border-2 border-black bg-[#fff7e0] px-2 py-0.5 text-[11px] leading-snug font-bold whitespace-nowrap text-[#2a1a10] shadow-[2px_2px_0_#000]",
            right ? "right-0" : "left-0",
          )}
        >
          {seat.bubble.text}
        </p>
      ) : null}
    </div>
  );
}

/** 판 위에 크게 뜨는 글자(READY · FIGHT · WIN …) */
export function ArcadeBanner({
  text,
  sub,
  tone = "gold",
}: {
  text: string;
  sub?: string;
  tone?: "gold" | "red" | "cyan";
}) {
  return (
    <div className="pointer-events-none absolute inset-0 z-30 grid place-items-center">
      <div className="arcade-pop grid justify-items-center gap-2 text-center">
        <span
          className={cn(
            "arcade-px text-3xl sm:text-4xl",
            tone === "red"
              ? "neon-red"
              : tone === "cyan"
                ? "neon-cyan"
                : "neon-gold",
          )}
        >
          {text}
        </span>
        {sub ? (
          <span className="arcade-kr text-sm text-white drop-shadow-[0_2px_0_#000]">
            {sub}
          </span>
        ) : null}
      </div>
    </div>
  );
}
