"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "cn";
import { POKA_PROMO_EN } from "@/lib/brand-copy";
import { blindUpSound, breakSound, bustSound, championSound, countdownTick } from "@/lib/board-sound";
import { PRIZE_COLORS, boardStats, clockText, clockView, ftName, type BoardLevel, type GameBoardData } from "@/lib/game-board";

const won = (n: number) => Math.round(n).toLocaleString("en-US");
const blindText = (l: BoardLevel) => `SB ${won(l.sb)} / BB ${won(l.bb)}`;

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
export function GameBoardScreen({
  data,
  now,
  sound = false,
  className,
  viewUrl = null,
}: {
  data: GameBoardData;
  now: number;
  sound?: boolean;
  className?: string;
  /** 이 현황판 보기 링크(손님 휴대폰용). 없으면 휴대폰 보기 QR 대신 POKA 홈 */
  viewUrl?: string | null;
}) {
  const view = clockView(data, now);
  const { totalChips, avgStack } = boardStats(data);
  const prizes = data.prizes.filter((p) => p.place.trim() || p.amount.trim());
  const bb = view.level.isBreak ? (data.levels.slice(0, view.index).reverse().find((l) => !l.isBreak)?.bb ?? 0) : view.level.bb;
  const warn = !view.level.isBreak && view.running && view.remainingMs <= 60_000;
  const dur = view.level.minutes * 60_000;
  const progress = dur ? Math.min(1, Math.max(0, 1 - view.remainingMs / dur)) : 0;

  // 소리: 레벨 끝 5초 전부터 매초 "띡", 레벨이 바뀌면 블라인드 업(팡파르 + 음성) · 휴식 소리
  const secondsLeft = Math.ceil(view.remainingMs / 1000);
  const lastTick = useRef(0);
  useEffect(() => {
    if (!sound || !view.running || secondsLeft > 5 || secondsLeft < 1 || lastTick.current === secondsLeft) return;
    lastTick.current = secondsLeft;
    countdownTick(secondsLeft);
  }, [sound, view.running, secondsLeft]);
  const lastIndex = useRef(view.index);
  useEffect(() => {
    if (lastIndex.current === view.index) return;
    lastIndex.current = view.index;
    lastTick.current = 0;
    if (!sound || !view.running) return;
    if (view.level.isBreak) breakSound(view.level.minutes);
    else blindUpSound(view.number, view.level.sb, view.level.bb);
  }, [view.index, view.running, view.level, view.number, sound]);

  // 파이널 테이블: 남은 선수 · 1명이면 우승
  const ftList = data.ftOn ? (data.ftPlayers ?? []) : [];
  const ftAlive = ftList.map((p, i) => ({ key: i, name: ftName(p, i), out: p.out })).filter((p) => !p.out);
  const ft = { on: data.ftOn && ftList.length > 0, alive: ftAlive, champion: data.ftOn && ftList.length > 1 && ftAlive.length === 1 ? ftAlive[0].name : null };
  const lastAlive = useRef(ftAlive.length);
  useEffect(() => {
    const before = lastAlive.current;
    lastAlive.current = ftAlive.length;
    if (!sound || !data.ftOn || ftAlive.length >= before) return;
    if (ftAlive.length === 1) championSound();
    else bustSound();
  }, [ftAlive.length, data.ftOn, sound]);

  const nowLabel = kstTime(now);
  // 매장 이름이 길면 글씨를 줄여 한 줄에 다 보이게(16자까지는 그대로)
  const nameFit = Math.min(1, 16 / Math.max(1, [...data.name].length));
  const ticker = data.notice.trim();

  // 오른쪽 위 QR: 손님에게 쓸모 있는 것 — 기본은 「휴대폰으로 이 현황판 보기」, 점주가 고르면 매장 QR(카톡방 등)
  const qrMode = data.qrMode ?? "view";
  const qrTarget =
    qrMode === "off"
      ? null
      : qrMode === "store" && data.storeQrUrl
        ? data.storeQrUrl
        : viewUrl
          ? `${viewUrl}${viewUrl.includes("?") ? "&" : "?"}from=board`
          : `https://${SITE}/?from=board`;
  const qrLine =
    qrMode === "store" && data.storeQrUrl
      ? { top: "📱 찍으면", main: data.storeQrLabel || "매장 카톡방" }
      : viewUrl
        ? { top: "📱 블라인드 · 남은 시간", main: "휴대폰으로 보기" }
        : { top: "📱 찍으면", main: "POKA 홀덤 커뮤니티" };
  const [qr, setQr] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    if (!qrTarget) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- QR을 끄면 그림을 지움
      setQr(null);
      return;
    }
    void import("qrcode")
      .then((QR) => QR.toDataURL(qrTarget, { width: 300, margin: 1, color: { dark: "#000000", light: "#ffffff" } }))
      .then((url) => {
        if (alive) setQr(url);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [qrTarget]);

  return (
    <div data-game-screen className={cn("@container-[size] relative h-full w-full overflow-hidden bg-[radial-gradient(ellipse_at_top,#2a0d0d_0%,#0b0706_60%,#050303_100%)] text-white", className)}>
      {/* 배경 사진(올렸으면) + 글씨가 잘 보이게 어둡게 */}
      {data.bgUrl ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element -- 올린 배경 사진 */}
          <img data-board-bg src={data.bgUrl} alt="" aria-hidden className="absolute inset-0 size-full object-cover" />
          <div className="absolute inset-0 bg-black" style={{ opacity: data.bgDim / 100 }} />
        </>
      ) : null}
      {/* 글씨 단위 --u: 16:9면 폭 기준, 가로로 긴(낮은) 화면이면 높이 기준 */}
      <div className={cn("relative flex h-full flex-col [--u:min(1cqw,1.7cqh)]", data.bgUrl && "[text-shadow:0_2px_6px_rgba(0,0,0,.9)]")}>
      {/* 위 줄: 마크 · 이름 · 시각 */}
      <header className="flex items-center gap-[calc(var(--u)*1.5)] border-b border-[#c9a25c]/30 px-[calc(var(--u)*2.5)] py-[calc(var(--u)*0.9)]">
        {/* eslint-disable-next-line @next/next/no-img-element -- 브랜드 마크 */}
        <img src="/brand/poka-oni-mark.png" alt="POKA" className="h-auto w-[clamp(40px,calc(var(--u)*7),130px)] shrink-0" />
        <div className="grid min-w-0 flex-1">
          <span data-board-name className="block overflow-hidden text-ellipsis whitespace-nowrap leading-tight font-black text-amber-300" style={{ fontSize: `clamp(14px, calc(var(--u) * ${(4.6 * nameFit).toFixed(2)}), ${Math.round(92 * nameFit)}px)` }}>
            {data.name}
          </span>
          {data.subtitle ? <span className="truncate text-[clamp(11px,calc(var(--u)*1.6),30px)] font-bold text-zinc-300">{data.subtitle}</span> : null}
        </div>
        <span className="ml-auto shrink-0 text-[clamp(16px,calc(var(--u)*2.8),52px)] leading-none font-black text-zinc-200 tabular-nums">{nowLabel}</span>
        {qr ? (
          <span data-board-qr className="flex shrink-0 items-center gap-[calc(var(--u)*0.6)] [@container(max-height:380px)]:hidden">
            <span className="text-right text-[clamp(9px,calc(var(--u)*1.05),20px)] leading-tight font-bold text-zinc-300">
              {qrLine.top}
              <br />
              <b className="font-black text-amber-300">{qrLine.main}</b>
            </span>
            {/* eslint-disable-next-line @next/next/no-img-element -- 만든 QR 그림 */}
            <img src={qr} alt={`${qrLine.main} QR`} className="aspect-square w-[clamp(44px,calc(var(--u)*7),150px)] rounded-[calc(var(--u)*0.4)] bg-white p-[calc(var(--u)*0.2)]" />
          </span>
        ) : null}
      </header>

      {/* 흐르는 공지(위쪽): 적었을 때만 */}
      {ticker ? (
        <div data-notice className="overflow-hidden border-b border-[#c9a25c]/40 bg-[#3a0d0d]/80 py-[calc(var(--u)*0.4)]">
          <p className="inline-block animate-[poka-ticker_linear_infinite] pl-[100%] text-[clamp(13px,calc(var(--u)*1.9),38px)] font-bold whitespace-nowrap text-amber-100" style={{ animationDuration: `${Math.max(16, Math.round(ticker.length * 0.4))}s` }}>
            {ticker}
          </p>
        </div>
      ) : null}

      <div className="grid min-h-0 flex-1 gap-[calc(var(--u)*1.5)] px-[calc(var(--u)*1.4)] py-[calc(var(--u)*0.8)] @[560px]:grid-cols-[0.82fr_2.6fr_0.86fr] @[560px]:grid-rows-[minmax(0,1fr)]">
        {/* 가운데: 레벨 · 시계 · 블라인드(세로 화면은 맨 위) */}
        <section className="grid content-center justify-items-center gap-[calc(var(--u)*0.5)] text-center @[560px]:order-2">
          {/* 레벨 · (멈춤) 한 줄 — 시계 칸을 넓게 */}
          <span className="flex flex-wrap items-center justify-center gap-[calc(var(--u)*0.8)]">
            <span data-level className={cn("rounded-full px-[calc(var(--u)*2)] py-[calc(var(--u)*0.3)] text-[clamp(13px,calc(var(--u)*2),40px)] font-black tracking-wider", view.level.isBreak ? "bg-sky-500/25 text-sky-200" : "bg-amber-400/15 text-amber-300")}>
              {view.level.isBreak ? "BREAK" : `LEVEL ${view.number}`}
            </span>
            {!view.running ? (
              <span data-paused className="animate-pulse rounded-full bg-rose-600/85 px-[calc(var(--u)*1.5)] py-[calc(var(--u)*0.3)] text-[clamp(13px,calc(var(--u)*2),40px)] font-black">
                {view.finished ? "FINISHED" : "PAUSED"}
              </span>
            ) : null}
          </span>
          <span data-timer className={cn("leading-[0.95] font-black tabular-nums", warn ? "text-rose-400" : !view.running ? "text-white/70" : "text-white", "text-[clamp(56px,calc(var(--u)*13.5),300px)]")}>
            {clockText(view.remainingMs)}
          </span>
          <div className="h-[clamp(6px,calc(var(--u)*0.7),14px)] w-full max-w-[90%] overflow-hidden rounded-full bg-white/10">
            <div className={cn("h-full rounded-full", view.level.isBreak ? "bg-sky-400" : "bg-amber-400")} style={{ width: `${progress * 100}%` }} />
          </div>
          {view.level.isBreak ? (
            <span className="text-[clamp(18px,calc(var(--u)*3.4),64px)] font-black text-sky-200">TAKE A BREAK</span>
          ) : (
            <>
              <span data-blinds className="flex items-baseline gap-[calc(var(--u)*0.6)] text-[clamp(26px,calc(var(--u)*5.2),110px)] leading-tight font-black text-amber-200 tabular-nums">
                <small className={BLIND_TAG}>SB</small>
                {won(view.level.sb)}
                <span className="text-amber-200/60">/</span>
                <small className={BLIND_TAG}>BB</small>
                {won(view.level.bb)}
              </span>
              {view.level.ante ? <span className="text-[clamp(15px,calc(var(--u)*2.5),52px)] font-black text-amber-100 tabular-nums">BB ANTE {won(view.level.ante)}</span> : null}
            </>
          )}
          <span data-next className="text-[clamp(14px,calc(var(--u)*2.2),44px)] font-black text-sky-200 tabular-nums">
            {view.next ? (view.next.isBreak ? `NEXT: BREAK ${view.next.minutes} MIN` : `NEXT: ${blindText(view.next)}${view.next.ante ? ` · ANTE ${won(view.next.ante)}` : ""}`) : "LAST LEVEL"}
          </span>
        </section>

        {/* 왼쪽(가운데 정렬): 플레이어 · 리바인 · 얼리 · 애드온 · 평균 스택 · 총 칩(숫자 그대로) · 러닝 타임 · 브레이크 · 레지 마감 */}
        <section className="grid grid-cols-2 content-center gap-[calc(var(--u)*0.4)] text-center @[560px]:order-1 @[560px]:grid-cols-1">
          <div data-players className={CARD}>
            <span className={LABEL}>PLAYERS</span>
            <span className="text-[clamp(22px,calc(var(--u)*3.2),66px)] leading-tight font-black text-amber-300 tabular-nums [text-shadow:0_0_12px_rgba(252,211,77,.45)]">
              {won(data.remaining)}
              <span className="text-white/80"> / {won(data.entries)}</span>
            </span>
          </div>
          <div className={cn("grid gap-[calc(var(--u)*0.5)]", data.addonOn ? "grid-cols-3" : "grid-cols-2")}>
            <Mini data-rebuys label="REBUY" value={won(data.rebuys)} />
            <Mini data-earlies label="EARLY" value={won(data.earlies)} />
            {data.addonOn ? <Mini data-addons label="ADD-ON" value={won(data.addons)} /> : null}
          </div>
          <div data-avg className={CARD}>
            <span className={LABEL}>AVG STACK</span>
            <span className="text-[clamp(14px,calc(var(--u)*1.9),40px)] leading-tight font-black text-white tabular-nums">
              {avgStack ? won(avgStack) : "-"}
              {avgStack && bb ? <span className="ml-[calc(var(--u)*0.5)] text-[0.62em] font-bold text-amber-200">{(avgStack / bb).toFixed(1)} BB</span> : null}
            </span>
          </div>
          <div data-total className={CARD}>
            <span className={LABEL}>TOTAL CHIPS</span>
            <span className="text-[clamp(14px,calc(var(--u)*1.9),40px)] leading-tight font-black text-white tabular-nums">{totalChips ? won(totalChips) : "-"}</span>
          </div>
          <div className={cn(CARD, "gap-[calc(var(--u)*0.35)]")}>
            <div data-running className="grid">
              <span className={LABEL}>RUNNING TIME</span>
              <span className="text-[clamp(13px,calc(var(--u)*1.7),36px)] leading-tight font-black text-white tabular-nums">{clockText(view.runningMs)}</span>
            </div>
            <div className={cn("grid gap-[calc(var(--u)*0.4)] border-t border-white/10 pt-[calc(var(--u)*0.35)]", data.regLevel > 0 && "grid-cols-2")}>
              <TimeCell data-break label="BREAK" tone="text-sky-300" at={view.nextBreakMs != null ? kstTime(now + view.nextBreakMs) : undefined} value={view.nextBreakMs != null ? clockText(view.nextBreakMs) : view.level.isBreak ? "ON BREAK" : "-"} />
              {data.regLevel > 0 ? (
                <TimeCell
                  data-reg
                  label="REG CLOSE"
                  tone={view.regClosed ? "text-rose-400" : (view.regCloseMs ?? 0) <= 10 * 60_000 ? "text-amber-300" : "text-emerald-300"}
                  at={view.regClosed || view.regCloseMs == null ? undefined : kstTime(now + view.regCloseMs)}
                  value={view.regClosed ? "CLOSED" : clockText(view.regCloseMs ?? 0)}
                />
              ) : null}
            </div>
          </div>
        </section>

        {/* 오른쪽: 프라이즈(줄마다 색) · 맨 아래에 토탈 프라이즈를 크게 */}
        <section data-prize className={cn("flex min-h-0 flex-col gap-[calc(var(--u)*0.8)] @[560px]:order-3", data.prizeTitle ? "justify-end" : "justify-center")}>
          {prizes.length || data.prizeTitle ? (
            <>
              {prizes.length ? (
                <div className="flex max-h-[42cqh] min-h-0 flex-1 flex-col gap-[calc(var(--u)*0.5)] rounded-[calc(var(--u)*1.2)] border border-[#c9a25c]/35 bg-black/45 p-[calc(var(--u)*1.1)] @[560px]:max-h-full">
                  <span className="text-center text-[clamp(13px,calc(var(--u)*1.9),38px)] font-black tracking-[0.25em] text-[#e2bd72]">PRIZE</span>
                  <PrizeList prizes={prizes} />
                </div>
              ) : null}
              {data.prizeTitle ? (
                <div data-total-prize className="grid shrink-0 justify-items-center gap-[calc(var(--u)*0.2)] rounded-[calc(var(--u)*1.2)] border-2 border-[#e2bd72]/70 bg-[linear-gradient(180deg,rgba(60,40,10,.85),rgba(20,12,4,.85))] px-[calc(var(--u)*1)] py-[calc(var(--u)*0.7)]">
                  <span className="text-[clamp(11px,calc(var(--u)*1.4),30px)] font-black tracking-[0.25em] text-[#e2bd72]">TOTAL PRIZE</span>
                  <span data-prize-title className="text-center text-[clamp(20px,calc(var(--u)*3.4),72px)] leading-none font-black text-amber-200 tabular-nums">{data.prizeTitle}</span>
                </div>
              ) : null}
            </>
          ) : (
            <div className="grid justify-items-center gap-[calc(var(--u)*0.5)] opacity-80">
              {/* eslint-disable-next-line @next/next/no-img-element -- 장식 */}
              <img src="/brand/oni/stickers/holdem.webp" alt="" aria-hidden className="h-auto w-[clamp(80px,calc(var(--u)*14),260px)]" />
            </div>
          )}
        </section>
      </div>

      {/* 파이널 테이블: 남은 선수 이름표(탈락하면 사라짐) */}
      {ft.on ? (
        <section data-ft className="flex items-center gap-[calc(var(--u)*1)] border-t border-[#e2bd72]/40 bg-[linear-gradient(90deg,rgba(60,40,10,.7),rgba(20,12,4,.7))] px-[calc(var(--u)*1.6)] py-[calc(var(--u)*0.7)]">
          <span className="shrink-0 text-[clamp(11px,calc(var(--u)*1.5),30px)] leading-tight font-black tracking-[0.2em] text-[#e2bd72]">
            FINAL
            <br />
            TABLE
          </span>
          <div className="flex min-w-0 flex-1 flex-wrap justify-center gap-[calc(var(--u)*0.6)]">
            {ft.alive.map((p) => (
              <span key={p.key} data-ft-name className="rounded-[calc(var(--u)*0.6)] border border-amber-300/50 bg-black/60 px-[calc(var(--u)*1.1)] py-[calc(var(--u)*0.25)] text-[clamp(13px,calc(var(--u)*2.2),46px)] font-black text-amber-100">
                {p.name}
              </span>
            ))}
          </div>
          <span className="shrink-0 text-[clamp(12px,calc(var(--u)*1.6),32px)] font-black text-white tabular-nums">{ft.alive.length} LEFT</span>
        </section>
      ) : null}

      {/* 1명 남으면 우승 화면 */}
      {ft.champion ? (
        <div data-ft-champion className="absolute inset-0 z-20 grid place-items-center bg-black/85">
          <div className="grid justify-items-center gap-[calc(var(--u)*1)] text-center">
            <span className="text-[clamp(16px,calc(var(--u)*3),64px)] font-black tracking-[0.3em] text-[#e2bd72]">CHAMPION</span>
            <span className="text-[clamp(40px,calc(var(--u)*11),240px)] leading-none">🏆</span>
            <span className="text-[clamp(28px,calc(var(--u)*8),180px)] leading-none font-black text-amber-200 [text-shadow:0_0_24px_rgba(252,211,77,.55)]">{ft.champion}</span>
            <span className="text-[clamp(13px,calc(var(--u)*2),40px)] font-bold text-zinc-300">{data.name}</span>
          </div>
        </div>
      ) : null}

      {/* 맨 아래 한 줄: POKA 주소 · 홍보(움직이지 않음) */}
      <footer data-promo className="flex items-center justify-center gap-[calc(var(--u)*0.8)] border-t border-[#c9a25c]/30 bg-black/60 px-[calc(var(--u)*1.4)] py-[calc(var(--u)*0.45)] text-[clamp(10px,calc(var(--u)*1.35),26px)] font-bold whitespace-nowrap text-zinc-300">
        <b className="font-black text-amber-300">FREE GAME CLOCK BY POKA</b>
        <span className="truncate">{PROMO}</span>
        <b className="font-black tracking-wide text-[#e2bd72]">{SITE}</b>
      </footer>

      </div>
    </div>
  );
}

/** 현황판에 늘 나오는 POKA 홍보 */
const SITE = "pokerwiki.co.kr";
const PROMO = POKA_PROMO_EN;
const BLIND_TAG = "text-[0.42em] font-black tracking-wider text-amber-300/80";
const CARD = "grid justify-items-center gap-[calc(var(--u)*0.1)] rounded-[calc(var(--u)*1)] border border-white/15 bg-black/55 px-[calc(var(--u)*1.1)] py-[calc(var(--u)*0.32)] text-center";
const LABEL = "text-[clamp(10px,calc(var(--u)*1.1),24px)] font-black tracking-wide text-zinc-400";

/** 한국 시각 "21:40" */
function kstTime(ms: number) {
  return new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(ms));
}

/** 시간 칸: 이름 · 남은 시간(색) · 실제 시각 — 가운데 정렬 */
function TimeCell({ label, value, at, tone, ...rest }: { label: string; value: string; at?: string; tone: string } & Record<`data-${string}`, unknown>) {
  return (
    <div {...rest} className="grid justify-items-center">
      <span className={cn(LABEL, "whitespace-nowrap")}>{label}</span>
      <span className={cn("text-[clamp(13px,calc(var(--u)*1.6),34px)] leading-tight font-black tabular-nums", tone)}>{value}</span>
      {at ? <span className="text-[clamp(9px,calc(var(--u)*1),22px)] font-bold text-zinc-400 tabular-nums [@container(max-height:380px)]:hidden">at {at}</span> : null}
    </div>
  );
}

/** 리바인 · 얼리 · 애드온 작은 칸 */
function Mini({ label, value, ...rest }: { label: string; value: string } & Record<`data-${string}`, unknown>) {
  return (
    <div {...rest} className="grid justify-items-center rounded-[calc(var(--u)*0.9)] border border-white/15 bg-black/55 px-[calc(var(--u)*0.5)] py-[calc(var(--u)*0.3)]">
      <span className="text-[clamp(9px,calc(var(--u)*1.05),22px)] font-black tracking-wide text-zinc-400">{label}</span>
      <span className="text-[clamp(14px,calc(var(--u)*1.8),38px)] leading-tight font-black text-white tabular-nums">{value}</span>
    </div>
  );
}

/** 프라이즈 줄: 칸보다 길면 위아래로 천천히 움직여 아래 순위까지 보여 줌 */
function PrizeList({ prizes }: { prizes: GameBoardData["prizes"] }) {
  const box = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const [shift, setShift] = useState(0);
  useEffect(() => {
    const measure = () => {
      if (box.current && list.current) setShift(Math.max(0, Math.ceil(list.current.scrollHeight - box.current.clientHeight)));
    };
    // ResizeObserver는 붙이자마자 한 번 불러 줍니다(처음 크기 재기)
    const ro = new ResizeObserver(measure);
    if (box.current) ro.observe(box.current);
    if (list.current) ro.observe(list.current);
    return () => ro.disconnect();
  }, [prizes.length]);
  const moving = shift > 4;
  // 잠깐 멈춤 → 아래까지 내려감 → 잠깐 멈춤 → 위로(줄 수에 맞춰 속도 조절)
  useEffect(() => {
    const el = list.current;
    if (!el || !moving || typeof el.animate !== "function") return;
    const down = `translateY(-${shift}px)`;
    // 위에서 2.5초 멈춤 → 1초에 45px씩 내려감 → 아래에서 2.5초 멈춤 → 다시 올라감
    const hold = 2500;
    const travel = Math.max(2000, Math.round((shift / 45) * 1000));
    const total = hold * 2 + travel * 2;
    const at = (ms: number) => ms / total;
    const anim = el.animate(
      [
        { transform: "translateY(0)", offset: 0 },
        { transform: "translateY(0)", offset: at(hold), easing: "ease-in-out" },
        { transform: down, offset: at(hold + travel) },
        { transform: down, offset: at(hold * 2 + travel), easing: "ease-in-out" },
        { transform: "translateY(0)", offset: 1 },
      ],
      { duration: total, iterations: Infinity },
    );
    return () => anim.cancel();
  }, [moving, shift]);
  return (
    <div ref={box} data-prize-box className="min-h-0 flex-1 overflow-hidden">
      <ul ref={list} data-prize-scroll={moving ? "on" : undefined} className="grid gap-[calc(var(--u)*0.3)]">
        {prizes.map((p, i) => (
          <li key={i} data-prize-row style={{ color: PRIZE_COLORS[p.color].hex }} className="flex items-center justify-between gap-[calc(var(--u)*1)] border-b border-white/10 py-[calc(var(--u)*0.15)] pr-[max(16px,calc(var(--u)*1.2))] pl-[calc(var(--u)*0.4)] last:border-0">
            <span className="shrink-0 text-[clamp(12px,calc(var(--u)*1.6),32px)] font-black">{p.place}</span>
            <span
              data-prize-amount
              className={cn("min-w-0 truncate text-right leading-tight tabular-nums", i < 3 ? "font-black text-[clamp(17px,calc(var(--u)*2.35),48px)] [text-shadow:0_0_10px_rgba(255,207,74,.75),0_0_2px_#000]" : "font-extrabold text-[clamp(16px,calc(var(--u)*2.25),46px)]")}
            >
              {p.amount}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
