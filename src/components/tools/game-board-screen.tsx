"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "cn";
import { boardStats, chipText, clockText, clockView, prizeLines, type BoardLevel, type GameBoardData } from "@/lib/game-board";

const won = (n: number) => Math.round(n).toLocaleString("ko-KR");
const blindText = (l: BoardLevel) => `${won(l.sb)} / ${won(l.bb)}`;

/** 레벨이 바뀔 때 짧은 알림음(브라우저가 소리를 허락한 뒤에만) */
function beep(times = 3) {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    for (let i = 0; i < times; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + i * 0.35);
      gain.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + i * 0.35 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + i * 0.35 + 0.25);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.35);
      osc.stop(ctx.currentTime + i * 0.35 + 0.3);
    }
    window.setTimeout(() => void ctx.close(), times * 400 + 200);
  } catch {
    /* 소리 못 내도 화면은 그대로 */
  }
}

/** 서버 시각에 맞춘 지금(ms): offset = 서버 시각 − 내 시각 */
export function useServerNow(initialNow: number, offset: number) {
  const [now, setNow] = useState(initialNow);
  useEffect(() => {
    const tick = () => setNow(Date.now() + offset);
    tick();
    const timer = window.setInterval(tick, 250);
    return () => window.clearInterval(timer);
  }, [offset]);
  return now;
}

/**
 * 게임 현황판 화면(TV · 미리보기 공통). 화면 폭에 맞춰 글씨가 커집니다(cqw).
 * 가로 화면: 왼쪽 인원·스택 · 가운데 시계 · 오른쪽 상금 / 세로 화면: 시계 먼저 위에서 아래로.
 */
export function GameBoardScreen({ data, now, sound = false, className }: { data: GameBoardData; now: number; sound?: boolean; className?: string }) {
  const view = clockView(data, now);
  const { totalChips, avgStack } = boardStats(data);
  const prizes = prizeLines(data.prize);
  const bb = view.level.isBreak ? (data.levels.slice(0, view.index).reverse().find((l) => !l.isBreak)?.bb ?? 0) : view.level.bb;
  const warn = !view.level.isBreak && view.running && view.remainingMs <= 60_000;
  const dur = view.level.minutes * 60_000;
  const progress = dur ? Math.min(1, Math.max(0, 1 - view.remainingMs / dur)) : 0;

  // 레벨이 바뀌면 알림음
  const lastIndex = useRef(view.index);
  useEffect(() => {
    if (lastIndex.current !== view.index) {
      if (sound && view.running) beep(view.level.isBreak ? 2 : 3);
      lastIndex.current = view.index;
    }
  }, [view.index, view.running, view.level.isBreak, sound]);

  const nowLabel = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(now));

  return (
    <div data-game-screen className={cn("@container-[size] relative h-full w-full overflow-hidden bg-[radial-gradient(ellipse_at_top,#2a0d0d_0%,#0b0706_60%,#050303_100%)] text-white", className)}>
      {/* 글씨 단위 --u: 16:9면 폭 기준, 가로로 긴(낮은) 화면이면 높이 기준 */}
      <div className="flex h-full flex-col [--u:min(1cqw,1.7cqh)]">
      {/* 위 줄: 마크 · 이름 · 시각 */}
      <header className="flex items-center gap-[calc(var(--u)*1.5)] border-b border-[#c9a25c]/30 px-[calc(var(--u)*2.5)] py-[calc(var(--u)*0.9)]">
        {/* eslint-disable-next-line @next/next/no-img-element -- 브랜드 마크 */}
        <img src="/brand/poka-oni-mark.png" alt="POKA" className="h-auto w-[clamp(36px,calc(var(--u)*6),110px)] shrink-0" />
        <div className="grid min-w-0">
          <span data-board-name className="truncate text-[clamp(18px,calc(var(--u)*3.4),64px)] leading-tight font-black text-amber-300">
            {data.name}
          </span>
          {data.subtitle ? <span className="truncate text-[clamp(11px,calc(var(--u)*1.6),30px)] font-bold text-zinc-300">{data.subtitle}</span> : null}
        </div>
        <span className="ml-auto shrink-0 text-[clamp(16px,calc(var(--u)*2.8),52px)] font-black text-zinc-200 tabular-nums">{nowLabel}</span>
      </header>

      <div className="grid min-h-0 flex-1 gap-[calc(var(--u)*1.5)] p-[calc(var(--u)*1.4)] @[560px]:grid-cols-[1fr_2.1fr_1fr]">
        {/* 가운데: 레벨 · 시계 · 블라인드(세로 화면은 맨 위) */}
        <section className="grid content-center justify-items-center gap-[calc(var(--u)*0.5)] text-center @[560px]:order-2">
          <span data-level className={cn("rounded-full px-[calc(var(--u)*2)] py-[calc(var(--u)*0.3)] text-[clamp(15px,calc(var(--u)*2.3),46px)] font-black tracking-wider", view.level.isBreak ? "bg-sky-500/25 text-sky-200" : "bg-amber-400/15 text-amber-300")}>
            {view.level.isBreak ? "BREAK · 휴식" : `LEVEL ${view.number}`}
          </span>
          <span data-timer className={cn("leading-none font-black tabular-nums", warn ? "text-rose-400" : "text-white", "text-[clamp(52px,calc(var(--u)*11.5),260px)]")}>
            {clockText(view.remainingMs)}
          </span>
          {!view.running ? (
            <span data-paused className="animate-pulse rounded-lg bg-rose-600/80 px-[calc(var(--u)*1.5)] text-[clamp(14px,calc(var(--u)*2),40px)] font-black">
              {view.finished ? "마지막 레벨 끝" : "일시 정지"}
            </span>
          ) : null}
          <div className="h-[clamp(6px,calc(var(--u)*0.7),14px)] w-full max-w-[90%] overflow-hidden rounded-full bg-white/10">
            <div className={cn("h-full rounded-full", view.level.isBreak ? "bg-sky-400" : "bg-amber-400")} style={{ width: `${progress * 100}%` }} />
          </div>
          {view.level.isBreak ? (
            <span className="text-[clamp(18px,calc(var(--u)*3.4),64px)] font-black text-sky-200">잠시 쉬어 갑니다</span>
          ) : (
            <>
              <span data-blinds className="text-[clamp(24px,calc(var(--u)*4.6),100px)] leading-tight font-black text-amber-200 tabular-nums">
                {blindText(view.level)}
              </span>
              {view.level.ante ? <span className="text-[clamp(15px,calc(var(--u)*2.3),48px)] font-black text-amber-100/90 tabular-nums">BB 앤티 {won(view.level.ante)}</span> : null}
            </>
          )}
          <span data-next className="text-[clamp(13px,calc(var(--u)*2),38px)] font-bold text-zinc-300 tabular-nums">
            {view.next ? (view.next.isBreak ? `다음: 휴식 ${view.next.minutes}분` : `다음: ${blindText(view.next)}${view.next.ante ? ` · 앤티 ${won(view.next.ante)}` : ""}`) : "마지막 레벨"}
          </span>
        </section>

        {/* 왼쪽: 인원 · 스택 */}
        <section className="grid grid-cols-2 content-center gap-[calc(var(--u)*0.7)] @[560px]:order-1 @[560px]:grid-cols-1">
          <Stat label="남은 인원" value={data.entries ? `${won(data.remaining)} / ${won(data.entries)}` : won(data.remaining)} big />
          <Stat label="평균 스택" value={avgStack ? won(avgStack) : "-"} sub={avgStack && bb ? `${(avgStack / bb).toFixed(1)} BB` : undefined} big />
          <Stat label="총 칩" value={totalChips ? chipText(totalChips) : "-"} />
          <Stat label={view.nextBreakMs != null ? "다음 휴식까지" : "리바이 · 애드온"} value={view.nextBreakMs != null ? clockText(view.nextBreakMs) : `${won(data.rebuys)} · ${won(data.addons)}`} />
        </section>

        {/* 오른쪽: 상금 */}
        <section data-prize className="grid content-center gap-[calc(var(--u)*0.6)] @[560px]:order-3">
          {prizes.length ? (
            <div className="grid gap-[calc(var(--u)*0.5)] rounded-[calc(var(--u)*1.2)] border border-[#c9a25c]/35 bg-black/45 p-[calc(var(--u)*1.4)]">
              <span className="text-[clamp(13px,calc(var(--u)*1.9),36px)] font-black text-[#c9a25c]">PRIZE · 상금</span>
              <ul className="grid gap-[calc(var(--u)*0.3)]">
                {prizes.map((p, i) => (
                  <li key={i} className="flex items-baseline justify-between gap-[calc(var(--u)*1)] border-b border-white/10 pb-[calc(var(--u)*0.2)] last:border-0">
                    <span className={cn("font-black", i === 0 ? "text-amber-300" : "text-zinc-200", "text-[clamp(13px,calc(var(--u)*1.9),36px)]")}>{p.place}</span>
                    <span className={cn("font-black tabular-nums", i === 0 ? "text-amber-200" : "text-white", "text-[clamp(14px,calc(var(--u)*2.1),40px)]")}>{p.amount}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="grid justify-items-center gap-[calc(var(--u)*0.5)] opacity-80">
              {/* eslint-disable-next-line @next/next/no-img-element -- 장식 */}
              <img src="/brand/oni/stickers/holdem.webp" alt="" aria-hidden className="h-auto w-[clamp(80px,calc(var(--u)*14),260px)]" />
            </div>
          )}
        </section>
      </div>

      {/* 아래: 공지 */}
      {data.notice ? (
        <footer data-notice className="overflow-hidden border-t border-[#c9a25c]/30 bg-black/60 py-[calc(var(--u)*0.8)]">
          <p className="inline-block animate-[poka-ticker_22s_linear_infinite] pl-[100%] motion-reduce:animate-none motion-reduce:pl-[calc(var(--u)*2)] text-[clamp(14px,calc(var(--u)*2.2),42px)] font-bold whitespace-nowrap text-amber-100">{data.notice}</p>
        </footer>
      ) : null}
      </div>
    </div>
  );
}

function Stat({ label, value, sub, big = false }: { label: string; value: string; sub?: string; big?: boolean }) {
  return (
    <div className="grid gap-[calc(var(--u)*0.2)] rounded-[calc(var(--u)*1.2)] border border-white/10 bg-black/45 px-[calc(var(--u)*1.4)] py-[calc(var(--u)*0.5)]">
      <span className="text-[clamp(11px,calc(var(--u)*1.35),28px)] font-bold text-zinc-400">{label}</span>
      <span className={cn("leading-tight font-black text-white tabular-nums", big ? "text-[clamp(18px,calc(var(--u)*2.6),54px)]" : "text-[clamp(16px,calc(var(--u)*2.1),42px)]")}>{value}</span>
      {sub ? <span className="text-[clamp(11px,calc(var(--u)*1.6),30px)] font-bold text-amber-200 tabular-nums">{sub}</span> : null}
    </div>
  );
}
