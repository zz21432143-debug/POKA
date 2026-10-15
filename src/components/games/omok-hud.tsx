"use client";

import { cn } from "cn";
import { StoneDot } from "@/components/games/omok-board";
import { PotTitleBadge } from "@/components/honor/crowned-frame";
import { yokaiImage, type YokaiSpecies } from "@/lib/yokai";
import { emoteLabel, emoteSrc, isOniEmote } from "@/lib/omok-emotes";

/** 오니 이모티콘 그림(예전 글자 이모티콘이면 글자 그대로) */
export function EmoteArt({ e, className }: { e: string; className?: string }) {
  if (!isOniEmote(e)) return <span className={className}>{e}</span>;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- 오니 이모티콘
    <img
      src={emoteSrc(e)}
      alt={emoteLabel(e)}
      draggable={false}
      className={cn("object-contain", className)}
    />
  );
}

export type HudSeat = {
  name: string;
  yokai: { species: YokaiSpecies; stage: number } | null;
  /** 돌 색(대기실에서는 아직 없음) */
  color: 1 | 2 | 0;
  /** 나 · 상대 · 방장 · 손님 · 요괴 */
  tag: string;
  /** 「3승 1패 1기권」 */
  record?: string | null;
  /** 이 사람 기준 상대 전적(「상대전적 2승 1패」) */
  vs?: string | null;
  active: boolean;
  secondsLeft?: number | null;
  totalSeconds?: number;
  bubble?: { text: string; key: number | string } | null;
  /** 대국 중 이모티콘: 판이 아니라 이 명판 위에 크게 */
  emote?: { e: string; key: number | string } | null;
  result?: "win" | "lose" | null;
  /** 아직 아무도 안 앉은 자리 */
  empty?: boolean;
  /** 대기실 READY(undefined면 표시 안 함) */
  ready?: boolean;
  /** 돌을 둔 순간 요괴가 펄쩍 */
  jumpKey?: number;
};

/** 위 HUD: 왼쪽 명판 · VS · 오른쪽 명판(거울) */
export function OmokHud({ left, right }: { left: HudSeat; right: HudSeat }) {
  return (
    <div
      data-omok-hud
      className="relative grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-1.5"
    >
      <Plate seat={left} side="left" />
      <span className="vs-badge text-lg sm:text-2xl" aria-hidden>
        VS
      </span>
      <Plate seat={right} side="right" />
    </div>
  );
}

const TAG_TONE: Record<string, string> = {
  나: "bg-[#6ad7ff] text-[#002433]",
  상대: "bg-[#ff5d6c] text-white",
  요괴: "bg-[#b77bff] text-white",
  방장: "bg-[#ffcf4a] text-[#2a1400]",
  손님: "bg-[#3ddc97] text-[#052616]",
};

function Plate({ seat, side }: { seat: HudSeat; side: "left" | "right" }) {
  const ratio =
    seat.secondsLeft != null && seat.totalSeconds
      ? Math.max(0, Math.min(1, seat.secondsLeft / seat.totalSeconds))
      : null;
  const right = side === "right";
  return (
    <div
      data-omok-player={
        seat.color === 1 ? "b" : seat.color === 2 ? "w" : "seat"
      }
      data-active={seat.active ? "1" : undefined}
      data-ready={seat.ready ? "1" : undefined}
      className={cn(
        "hud-plate relative grid gap-1.5 p-2",
        seat.result === "lose" && "opacity-70",
      )}
    >
      <div
        className={cn(
          "flex min-w-0 items-center gap-2",
          right && "flex-row-reverse",
        )}
      >
        <div
          className={cn(
            "hud-portrait relative size-14 shrink-0 overflow-hidden sm:size-16",
            seat.active && "arcade-bob",
          )}
        >
          {seat.empty ? (
            <span className="arcade-px arcade-blink grid size-full place-items-center text-2xl text-[#ffcf4a]">
              ?
            </span>
          ) : seat.yokai ? (
            // eslint-disable-next-line @next/next/no-img-element -- 요괴 픽셀 그림
            <img
              key={seat.jumpKey}
              src={yokaiImage(seat.yokai.species, seat.yokai.stage)}
              alt=""
              draggable={false}
              className={cn(
                "size-full object-contain",
                seat.jumpKey ? "arcade-jump" : "",
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
        <div
          className={cn(
            "grid min-w-0 flex-1 gap-0.5",
            right && "justify-items-end text-right",
          )}
        >
          <div
            className={cn(
              "flex items-center gap-1",
              right && "flex-row-reverse",
            )}
          >
            <span
              className={cn(
                "rounded-md px-1.5 text-[11px] leading-5 font-black",
                TAG_TONE[seat.tag] ?? "bg-white/15 text-white",
              )}
            >
              {seat.tag}
            </span>
            {seat.color ? (
              <StoneDot color={seat.color} className="size-4" />
            ) : null}
          </div>
          <b className="max-w-full truncate text-[15px] leading-tight font-black text-white sm:text-base">
            {seat.empty ? "빈자리" : seat.name}
          </b>
          {!seat.empty && seat.name ? (
            <span data-omok-honor className="flex max-w-full flex-wrap gap-1 empty:hidden">
              <PotTitleBadge nickname={seat.name} max={1} yokai={false} className="!text-[10px]" />
            </span>
          ) : null}
          {seat.record ? (
            <span
              data-omok-record
              className="max-w-full truncate text-xs font-bold text-[#d6cdee]"
            >
              {seat.record}
            </span>
          ) : null}
          {seat.vs ? (
            <span
              data-omok-vs
              className="max-w-full rounded-md bg-[#6ad7ff]/15 px-1.5 text-[11px] leading-4 font-black whitespace-nowrap text-[#8eeaff]"
            >
              ⚔ {seat.vs}
            </span>
          ) : null}
        </div>
      </div>
      {seat.ready !== undefined ? (
        <span
          data-seat-ready={seat.ready ? "1" : "0"}
          className={cn(
            "rounded-lg py-1 text-center text-sm font-black",
            seat.ready
              ? "bg-[#3ddc97] text-[#052616]"
              : "bg-white/10 text-[#d6cdee]",
          )}
        >
          {seat.empty ? "기다리는 중…" : seat.ready ? "✅ READY!" : "준비 중…"}
        </span>
      ) : ratio !== null ? (
        <div
          className={cn(
            "flex items-center gap-1.5",
            right && "flex-row-reverse",
          )}
          aria-label={`남은 시간 ${seat.secondsLeft}초`}
        >
          <div
            className={cn("hud-bar flex-1", right && "-scale-x-100")}
            data-low={ratio <= 0.25 ? "1" : undefined}
          >
            <span style={{ width: `${ratio * 100}%` }} />
          </div>
          <span
            className={cn(
              "w-6 text-sm font-black tabular-nums",
              ratio <= 0.25 ? "text-[#ff5d6c]" : "text-white",
              right ? "text-left" : "text-right",
            )}
          >
            {seat.secondsLeft}
          </span>
        </div>
      ) : (
        <div className="hud-bar opacity-40">
          <span style={{ width: "0%" }} />
        </div>
      )}
      {seat.result === "win" ? (
        <span className="arcade-px neon-gold arcade-pop absolute -top-3 left-1/2 -translate-x-1/2 text-xs">
          WIN
        </span>
      ) : null}
      {seat.emote ? (
        <span
          key={seat.emote.key}
          data-omok-plate-emote
          className="plate-emote pointer-events-none absolute inset-0 z-40 grid place-items-center"
          aria-label={`이모티콘 ${emoteLabel(seat.emote.e)}`}
        >
          <span className="drop-shadow-[0_3px_0_#0a0614]">
            <EmoteArt
              e={seat.emote.e}
              className="size-24 text-5xl sm:size-28"
            />
          </span>
        </span>
      ) : null}
      {seat.bubble ? (
        <p
          key={seat.bubble.key}
          data-omok-bubble
          className={cn(
            "omok-bubble-pop pointer-events-none absolute bottom-full z-40 mb-1.5 max-w-[170%] rounded-xl border-2 border-[#0a0614] bg-[#fff7e0] px-2.5 py-1 text-sm leading-snug font-black whitespace-nowrap text-[#2a1a10] shadow-[3px_3px_0_#0a0614]",
            right ? "right-1" : "left-1",
          )}
        >
          {seat.bubble.text}
        </p>
      ) : null}
    </div>
  );
}

/** 판 위에 크게 뜨는 글자(READY · FIGHT · UNDO …) */
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
            "arcade-px text-4xl sm:text-5xl",
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
          <span className="arcade-kr text-lg text-white drop-shadow-[0_2px_0_#000]">
            {sub}
          </span>
        ) : null}
      </div>
    </div>
  );
}

export type CutInData = {
  key: number;
  side: "left" | "right";
  yokai: { species: YokaiSpecies; stage: number } | null;
  text?: string;
  emoji?: string;
  tone?: "red" | "gold" | "blue" | "green";
};
const CUT_TONE: Record<NonNullable<CutInData["tone"]>, [string, string]> = {
  red: ["#7a1cff", "#ff3d6e"],
  gold: ["#ff7a1c", "#ffd34d"],
  blue: ["#1c5bff", "#3de1ff"],
  green: ["#0f8a5f", "#4ff0a8"],
};

/** 요괴 컷인: 판 위를 가로지르는 띠 + 크게 튀어나오는 요괴 + 큰 대사(또는 큰 이모티콘) */
export function YokaiCutIn({ data }: { data: CutInData }) {
  const [a, b] = CUT_TONE[data.tone ?? "red"];
  return (
    <div
      data-omok-cutin
      className="cutin"
      style={{ ["--cut-a" as string]: a, ["--cut-b" as string]: b }}
    >
      <div className="cutin-band" />
      {data.yokai ? (
        // eslint-disable-next-line @next/next/no-img-element -- 요괴 컷인
        <img
          src={yokaiImage(data.yokai.species, data.yokai.stage)}
          alt=""
          draggable={false}
          className="cutin-yokai"
          data-side={data.side}
        />
      ) : null}
      <div className="cutin-text" data-side={data.side}>
        {data.emoji ? (
          <span className="cutin-emoji">
            <EmoteArt e={data.emoji} className="size-[1.6em]" />
          </span>
        ) : (
          data.text
        )}
      </div>
    </div>
  );
}

/** 관전석: 관전자 수 · 로그인한 사람 닉네임 */
export function Spectators({
  count,
  names,
  me,
}: {
  count: number;
  names: string[];
  me?: boolean;
}) {
  const guests = Math.max(0, count - names.length);
  return (
    <div data-omok-spectators className="flex flex-wrap items-center gap-1.5">
      <span className="g-chip !border-[#6ad7ff]/60 !text-[#8eeaff]">
        👀 관전 {count}명{me ? " (나 포함)" : ""}
      </span>
      {names.slice(0, 8).map((n) => (
        <span key={n} data-omok-spectator className="g-chip !text-white">
          {n}
        </span>
      ))}
      {names.length > 8 ? (
        <span className="g-chip">+{names.length - 8}</span>
      ) : null}
      {guests > 0 ? <span className="g-chip">손님 {guests}</span> : null}
    </div>
  );
}

/** 5목! 화면을 덮는 큰 요괴 등장 + 훈수 */
export function BigWinCutIn({
  yokai,
  title,
  tip,
  side,
}: {
  yokai: { species: YokaiSpecies; stage: number } | null;
  title: string;
  tip: string;
  side: "left" | "right";
}) {
  return (
    <div
      data-omok-bigwin
      className="bigwin pointer-events-none absolute inset-0 z-40 grid place-items-center overflow-hidden rounded-[14px]"
    >
      <div className="bigwin-rays" />
      <div className="relative grid w-full justify-items-center gap-2 px-3 text-center">
        <p className="arcade-kr neon-gold bigwin-title text-4xl sm:text-5xl">
          {title}
        </p>
        {yokai ? (
          <span
            className={cn(
              "grid w-[58%] max-w-[300px] place-items-center",
              side === "right" && "-scale-x-100",
            )}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- 이긴 요괴 */}
            <img
              src={yokaiImage(yokai.species, yokai.stage)}
              alt=""
              draggable={false}
              className="bigwin-yokai w-full object-contain"
            />
          </span>
        ) : null}
        {tip ? (
          <p className="bigwin-tip max-w-[92%] rounded-2xl border-[3px] border-[#0a0614] bg-[#fff7e0] px-4 py-2.5 text-base leading-snug font-black text-[#2a1a10] shadow-[4px_4px_0_#0a0614] sm:text-lg">
            <span className="mr-1 rounded-md bg-[#7a1cff] px-1.5 py-0.5 text-xs text-white">
              훈수
            </span>
            {tip}
          </p>
        ) : null}
      </div>
    </div>
  );
}

/**
 * 관전석 줄(HUD와 판 사이 · 늘 같은 높이): 관전자 수 · 닉네임, 응원이 오면 크게 오니 이모티콘 + 닉네임.
 * 판은 가리지 않고, 화면에서 가장 잘 보이는 자리.
 */
export function CheerStrip({
  count,
  names,
  cheers,
  now,
  me,
}: {
  count: number;
  names: string[];
  cheers: { n: string; e: string; at: number }[];
  now: number;
  me?: boolean;
}) {
  const live = cheers.filter((c) => now - c.at < 5000).slice(-4);
  return (
    <div
      data-omok-cheer-strip
      className="flex min-h-[72px] items-center gap-2 overflow-hidden rounded-2xl border-2 border-[#6ad7ff]/40 bg-[#0d1a33]/70 px-2.5 py-1.5"
    >
      <span className="grid shrink-0 justify-items-center leading-tight">
        <span className="text-lg">👀</span>
        <b className="text-xs font-black text-[#8eeaff]">
          관전 {count}
          {me ? "(나)" : ""}
        </b>
      </span>
      {live.length ? (
        <div
          data-omok-cheers
          className="flex min-w-0 flex-1 items-center justify-end gap-2"
        >
          {live.map((c) => (
            <span
              key={`${c.n}-${c.at}`}
              data-omok-cheer
              className="cheer-pop grid shrink-0 justify-items-center"
            >
              <EmoteArt
                e={c.e}
                className="size-12 drop-shadow-[0_3px_0_#0a0614] sm:size-14"
              />
              <span className="max-w-20 truncate rounded-full bg-[#0a0614] px-2 text-[11px] font-black text-[#8eeaff]">
                {c.n}
              </span>
            </span>
          ))}
        </div>
      ) : (
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
          {names.length ? (
            names.slice(0, 6).map((n) => (
              <span key={n} data-omok-spectator className="g-chip !text-white">
                {n}
              </span>
            ))
          ) : (
            <span className="text-sm text-[#d6cdee]">
              {count ? "손님이 관전 중이에요" : "응원이 오면 여기에 크게 떠요"}
            </span>
          )}
          {names.length > 6 ? (
            <span className="g-chip">+{names.length - 6}</span>
          ) : null}
        </div>
      )}
    </div>
  );
}
