"use client";

import { cn } from "cn";
import { StoneDot } from "@/components/games/omok-board";
import { GameChampionBadge, PotTitleBadge } from "@/components/honor/crowned-frame";
import { yokaiImage, type YokaiSpecies } from "@/lib/yokai";
import { emoteLabel, emoteSrc, isOniEmote, isQuickText, quickLabel } from "@/lib/omok-emotes";
import type { Watcher } from "@/lib/game-watch";

/** 오니 이모티콘 그림(예전 글자 이모티콘이면 글자 그대로) */
export function EmoteArt({ e, className }: { e: string; className?: string }) {
  if (isQuickText(e))
    return (
      <span
        data-quick-text={e}
        className={cn(
          "relative grid place-items-center border-2 border-[#0a0614] bg-[#fff6dc] px-1.5 text-[13px] leading-none font-black whitespace-nowrap text-[#2a1400] shadow-[2px_2px_0_#0a0614] after:absolute after:-bottom-[7px] after:left-1/2 after:size-0 after:-translate-x-1/2 after:border-x-[5px] after:border-t-[6px] after:border-x-transparent after:border-t-[#0a0614]",
          className,
          "!h-auto !w-auto min-h-7 min-w-9",
        )}
      >
        {quickLabel(e)}
      </span>
    );
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
  /** 나가서 빈 자리(「퇴장함」) */
  gone?: boolean;
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
          data-omok-portrait={seat.color === 1 ? "b" : seat.color === 2 ? "w" : ""}
          className={cn(
            "hud-portrait relative size-14 shrink-0 overflow-hidden sm:size-16",
            seat.active && "arcade-bob",
            // 같은 요괴끼리 붙어도 구별: 흑 = 검은 픽셀 테두리 · 백 = 흰 픽셀 테두리
            seat.color === 1 && "!border-[#0a0a0a] shadow-[0_0_0_3px_#0a0a0a,0_0_0_5px_#ffcf4a]",
            seat.color === 2 && "!border-[#ffffff] shadow-[0_0_0_3px_#f4f1ea,0_0_0_5px_#0a0614]",
          )}
        >
          {seat.color ? (
            <span
              aria-hidden
              className={cn(
                "absolute inset-x-0 bottom-0 z-10 h-[22%] border-t-2",
                seat.color === 1 ? "border-[#ffcf4a] bg-[#0a0a0a]" : "border-[#0a0614] bg-[#f4f1ea]",
              )}
            />
          ) : null}
          {seat.empty ? (
            <span data-omok-empty-seat className="arcade-px arcade-blink grid size-full place-items-center text-2xl text-[#ffcf4a]">
              ?
            </span>
          ) : seat.gone ? (
            <span data-omok-gone className="grid size-full place-items-center bg-black/60 text-3xl grayscale">
              🚪
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
          {!seat.empty && seat.name ? <GameChampionBadge nickname={seat.name} game="omok" /> : null}
          <b className="max-w-full truncate text-[15px] leading-tight font-black text-white sm:text-base">
            {seat.empty ? "도전자 대기 중" : seat.name}
          </b>
          {seat.gone ? (
            <span className="rounded-md bg-[#ff5d6c] px-1.5 text-[11px] leading-5 font-black text-white">
              🚪 퇴장함
            </span>
          ) : null}
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
        <p data-omok-victory className="arcade-px neon-gold bigwin-title text-4xl sm:text-6xl">
          VICTORY!
        </p>
        <p className="arcade-kr bigwin-title text-2xl text-white sm:text-3xl">{title}</p>
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
 * 관전석(판 바로 위 · 판은 안 가림): 관전자 미니 픽셀 아바타 줄.
 * 관전자가 응원 이모티콘을 누르면 그 사람 아바타 위로 1.5초 통통 튀며 떠오름.
 */
export function SpectatorBar({
  count,
  list,
  cheers,
  now,
  me,
}: {
  count: number;
  list: Watcher[];
  cheers: { n: string; e: string; at: number }[];
  now: number;
  me?: boolean;
}) {
  const live = cheers.filter((c) => now - c.at < 1600);
  const popOf = (n: string) => [...live].reverse().find((c) => c.n === n) ?? null;
  // 아바타 줄에 없는 사람(방금 들어옴 등)의 응원도 끝에 띄움
  const strays = live.filter((c) => !list.some((w) => w.n === c.n)).slice(-2);
  const guests = Math.max(0, count - list.length);
  return (
    <div
      data-omok-cheer-strip
      data-spectator-bar
      className="flex min-h-[92px] items-end gap-2 overflow-x-auto overflow-y-visible rounded-2xl border-2 border-[#6ad7ff]/40 bg-[#0d1a33]/70 px-2.5 pt-9 pb-1.5 [scrollbar-width:none]"
    >
      <span className="grid shrink-0 justify-items-center self-center leading-tight">
        <span className="text-lg">👀</span>
        <b className="text-xs font-black whitespace-nowrap text-[#8eeaff]">
          관전 {count}
          {me ? "(나)" : ""}
        </b>
      </span>
      {list.map((w) => {
        const pop = popOf(w.n);
        return (
          <span key={w.n} data-omok-spectator={w.n} className="relative grid w-14 shrink-0 justify-items-center gap-0.5">
            {pop ? (
              <span key={pop.at} data-omok-cheer className="spec-pop pointer-events-none absolute -top-9 z-10">
                <EmoteArt e={pop.e} className="size-11 drop-shadow-[0_3px_0_#0a0614]" />
              </span>
            ) : null}
            <span className={cn("grid size-10 place-items-center overflow-hidden rounded-lg border-2 bg-[#140b24]", pop ? "border-[#ffcf4a]" : "border-[#6ad7ff]/50")}>
              {w.s ? (
                // eslint-disable-next-line @next/next/no-img-element -- 관전자 대표 요괴(픽셀)
                <img src={yokaiImage(w.s, w.st)} alt="" draggable={false} className="size-[90%] object-contain [image-rendering:pixelated]" />
              ) : (
                <span className="arcade-px text-xs text-[#8eeaff]">?</span>
              )}
            </span>
            <span className="max-w-full truncate text-[10px] font-black text-white">{w.n}</span>
          </span>
        );
      })}
      {strays.map((c) => (
        <span key={`${c.n}-${c.at}`} className="relative grid w-14 shrink-0 justify-items-center">
          <span className="spec-pop absolute -top-9">
            <EmoteArt e={c.e} className="size-11" />
          </span>
          <span className="max-w-full truncate text-[10px] font-black text-[#8eeaff]">{c.n}</span>
        </span>
      ))}
      {guests > 0 ? <span className="g-chip shrink-0 self-center">손님 {guests}</span> : null}
      {!list.length && !guests && !strays.length ? (
        <span className="self-center text-sm text-[#d6cdee]">관전자가 들어오면 여기에 요괴 아바타로 앉아요</span>
      ) : null}
    </div>
  );
}
