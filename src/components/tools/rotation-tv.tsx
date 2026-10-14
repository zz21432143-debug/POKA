"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "cn";
import { formatWorkDate, kstClock, tableTag } from "@/lib/rotation";
import { formatClock, type RotationPlan } from "@/lib/rotation-plan";

/** TV 한 쪽에 보일 테이블 수(넘으면 pageSeconds초마다 쪽 넘김). 지금 · 교대 두 칸만이라 40개까지 한 화면 */
const TV_PAGE = 40;
/** 좌우로 나눌 수 있는 칸(블록) 수 */
const MAX_BLOCKS = 4;
/** 칸 사이 간격(px) */
const GAP = 12;
/** 표에서 테이블 이름 칸 비율 · 칸 사이 틈(px, border-spacing) */
const LABEL_FRAC = 0.22;
const SPACING = 3;

export type TvTheme = "dark" | "light";

const THEME = {
  dark: {
    root: "poka-watermark bg-black text-white",
    panel: "border-white/15 bg-zinc-950",
    title: "text-amber-300",
    sub: "text-zinc-300",
    clock: "text-amber-300",
    exit: "border-white/30 text-white",
    headline: "border-amber-400 bg-amber-950/40",
    headlineMain: "text-amber-300",
    headlineSub: "text-amber-100",
    rest: "text-amber-300",
    tableBorder: "border-white/15",
    labelHead: "bg-zinc-900 text-zinc-300",
    label: "bg-zinc-900 text-emerald-300",
    nowHead: "bg-emerald-700 text-white",
    nextHead: "bg-amber-500 text-black",
    nowCell: "bg-zinc-800 text-white",
    nextCell: "bg-amber-400/15 text-amber-100 ring-1 ring-amber-400/60",
    shut: "border border-rose-500 bg-rose-950 text-rose-300",
    empty: "text-zinc-500",
  },
  light: {
    root: "bg-[#f7f3ea] text-zinc-900",
    panel: "border-zinc-300 bg-white",
    title: "text-[#7a1c22]",
    sub: "text-zinc-600",
    clock: "text-[#7a1c22]",
    exit: "border-zinc-400 text-zinc-800",
    headline: "border-amber-500 bg-amber-100",
    headlineMain: "text-[#7a1c22]",
    headlineSub: "text-amber-900",
    rest: "text-amber-800",
    tableBorder: "border-zinc-300",
    labelHead: "bg-zinc-200 text-zinc-700",
    label: "bg-zinc-100 text-emerald-800",
    nowHead: "bg-emerald-600 text-white",
    nextHead: "bg-amber-500 text-black",
    nowCell: "bg-white text-zinc-900 ring-1 ring-zinc-300",
    nextCell: "bg-amber-100 text-zinc-900 ring-2 ring-amber-500",
    shut: "border border-rose-400 bg-rose-50 text-rose-700",
    empty: "text-zinc-400",
  },
} as const;

/** 글자 폭(em) 어림: 한글 1 · 영문/숫자 0.62 */
function textEm(text: string) {
  let em = 0;
  for (const ch of text) em += /[ㄱ-힝]/.test(ch) ? 1 : 0.62;
  return em;
}

/** 칸 수(1~4)마다 글씨 크기를 계산해 가장 크게 보이는 배치를 고름. 줄 높이를 정해 두어 스크롤이 생기지 않음 */
export function tvLayout(n: number, cols: number, width: number, height: number, nameEm: number, labelEm: number) {
  let best = { blocks: 1, rows: n + 1, rowH: height / (n + 1), font: 0, cellW: 0, labelW: 0 };
  for (let b = 1; b <= Math.min(MAX_BLOCKS, Math.max(1, n)); b++) {
    const rows = Math.ceil(n / b) + 1; // + 머리줄(시간)
    // 줄 사이 틈 · 표 테두리까지 빼고 나눔 → 표 높이가 자리보다 커지지 않음
    const rowH = (height - SPACING * (rows + 1) - 4) / rows;
    const blockW = (width - GAP * (b - 1)) / b;
    const cellW = (blockW * (1 - LABEL_FRAC)) / Math.max(cols, 1) - 10;
    const labelW = blockW * LABEL_FRAC - 10;
    const font = Math.min(rowH * 0.56, cellW / Math.max(nameEm, 3), labelW / Math.max(labelEm, 1.5), 140);
    if (font > best.font + 0.5) best = { blocks: b, rows, rowH, font, cellW, labelW };
  }
  return best;
}

type Row = { from: string | null; to: string | null; closed: boolean };
type Swap = { at: number; rows: (Row & { label: number })[]; toRest: string[] } | null;

/**
 * 로테이션 TV 화면: 지금 칸과 다음 교대 칸만 크게. 화면 크기를 재서 글씨 · 칸 수를 맞추므로 스크롤 없이 한 화면에 다 보임.
 * 테이블이 40개를 넘으면 pageSeconds초마다 쪽을 넘김.
 */
export function RotationTvScreen({
  gameName,
  workDate,
  clock,
  now,
  plan,
  openTables,
  name,
  closedFrom,
  current,
  next,
  swap,
  button,
  closed,
  pageSeconds,
  theme,
  onExit,
}: {
  gameName: string;
  workDate: string | null;
  clock: Date;
  now: number;
  plan: RotationPlan | null;
  openTables: { label: number; t: number }[];
  name: (id: string | null) => string;
  closedFrom: (number | null)[];
  current: number;
  next: number;
  swap: Swap;
  button: number | null;
  closed: boolean;
  pageSeconds: number;
  theme: TvTheme;
  onExit: () => void;
}) {
  const c = THEME[theme];
  const boardRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [pageTick, setPageTick] = useState(0);

  // 표가 들어갈 자리 크기(화면 크기 · 돌림이 바뀌면 다시 잼)
  useEffect(() => {
    const el = boardRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // TV를 띄운 동안 뒤 페이지는 스크롤되지 않게
  useEffect(() => {
    const html = document.documentElement;
    const before = html.style.overflow;
    html.style.overflow = "hidden";
    return () => {
      html.style.overflow = before;
    };
  }, []);

  const pageCount = Math.max(1, Math.ceil(openTables.length / TV_PAGE));
  useEffect(() => {
    if (pageCount <= 1) return;
    const timer = window.setInterval(() => setPageTick((n) => n + 1), pageSeconds * 1000);
    return () => window.clearInterval(timer);
  }, [pageCount, pageSeconds]);

  const pageIndex = pageTick % pageCount;
  const pageTables = openTables.slice(pageIndex * TV_PAGE, pageIndex * TV_PAGE + TV_PAGE);
  // 지금 칸 · 다음 교대 칸만(게임 시작 전이면 첫 칸만)
  const cols = plan ? [current, next].filter((i, k, all) => i >= 0 && all.indexOf(i) === k).map((index) => ({ slot: plan.slots[index], index })) : [];
  const cellText = (t: number, slotAt: number, seat: string | null) => (closedFrom[t] != null && slotAt >= (closedFrom[t] as number) ? "컨바인" : name(seat) || "—");
  const nameEm = Math.max(3, ...pageTables.flatMap(({ t }) => cols.map(({ slot }) => textEm(cellText(t, slot.at, slot.seats[t])))));
  const labelEm = Math.max(1.5, ...pageTables.map(({ label }) => textEm(tableTag(label))));
  const layout = tvLayout(pageTables.length, cols.length, size.w, size.h, nameEm, labelEm);
  const perBlock = Math.ceil(pageTables.length / layout.blocks);
  const blocks = Array.from({ length: layout.blocks }, (_, b) => pageTables.slice(b * perBlock, b * perBlock + perBlock)).filter((b) => b.length);
  const font = Math.max(10, layout.font);
  // 머리줄(「교대 01:40」 약 5.2em)도 칸 너비 안에 들어가게
  const headFont = Math.max(10, Math.min(font * 0.8, layout.rowH * 0.5, layout.cellW / 5.4));
  const labelHeadFont = Math.max(9, Math.min(headFont * 0.7, layout.labelW / 3.2));

  return (
    // 워터마크 스타일(position: relative)이 fixed를 덮어써 화면이 페이지 아래로 밀리므로 style로 직접 고정
    <div
      data-rotation-tv="on"
      data-tv-theme={theme}
      className={cn("inset-0 z-[9999] flex h-[100dvh] flex-col gap-[1.2dvh] overflow-hidden p-[1.2dvh]", c.root)}
      style={{ position: "fixed" }}
    >
      <header className={cn("flex shrink-0 items-center gap-[1.2vw] rounded-2xl border px-[1.5vw] py-[0.8dvh]", c.panel)}>
        {/* eslint-disable-next-line @next/next/no-img-element -- 작은 로고 한 장 */}
        <img src="/brand/poka-oni-mark.png" alt="POKA" className="h-auto w-[min(5vw,8dvh)] shrink-0" />
        <span className={cn("min-w-0 truncate font-black leading-tight", c.title)} style={{ fontSize: "min(3.2vw, 5.5dvh)" }}>
          {gameName}
        </span>
        <span className={cn("shrink-0 font-bold", c.sub)} style={{ fontSize: "min(1.6vw, 2.8dvh)" }}>
          {formatWorkDate(workDate)}
        </span>
        <span className={cn("ml-auto shrink-0 font-black tabular-nums", c.clock)} style={{ fontSize: "min(3.6vw, 6dvh)" }}>
          {kstClock(clock)}
        </span>
        <button type="button" onClick={onExit} className={cn("min-h-9 shrink-0 rounded-lg border px-2 text-xs font-black", c.exit)}>
          TV 화면 끄기
        </button>
      </header>

      {closed ? <p className="shrink-0 rounded-xl bg-rose-950 px-3 py-2 text-sm font-bold text-rose-200">공유가 꺼졌습니다. 담당자에게 새 링크를 받아 주세요.</p> : null}

      {/* 다음 교대: 시간 · 남은 분 · 버튼 자리 · 휴식 들어갈 사람(한 줄) */}
      {plan && swap ? (
        <section aria-label="다음 교대" className={cn("flex shrink-0 flex-wrap items-baseline gap-x-[1.2vw] gap-y-0 rounded-2xl border-2 px-[1.5vw] py-[0.8dvh]", c.headline)}>
          <span className={cn("font-black", c.headlineMain)} style={{ fontSize: "min(3vw, 5dvh)" }}>
            다음 교대 {formatClock(swap.at)}
          </span>
          <span className={cn("font-bold", c.headlineSub)} style={{ fontSize: "min(1.8vw, 3dvh)" }}>
            {swap.at - now <= 0 ? "지금" : swap.at - now < 60 ? `${swap.at - now}분 후` : `${Math.floor((swap.at - now) / 60)}시간 ${(swap.at - now) % 60}분 후`}
          </span>
          {button ? (
            <span className="rounded bg-white px-2 font-black text-black" style={{ fontSize: "min(1.6vw, 2.8dvh)" }}>
              버튼 {button}번
            </span>
          ) : null}
          {swap.toRest.length ? (
            <span className={cn("min-w-0 flex-1 basis-full truncate font-bold", c.rest)} style={{ fontSize: "min(1.5vw, 2.6dvh)" }}>
              휴식 들어감 {swap.toRest.map(name).join(", ")}
            </span>
          ) : null}
        </section>
      ) : null}

      {/* 표: 지금 · 교대 두 칸. 줄 높이를 화면에 맞춰 정해 스크롤 없음 */}
      <div ref={boardRef} data-tv-board className="relative min-h-0 flex-1 overflow-hidden">
        {!plan ? (
          <p className={cn("grid h-full place-items-center rounded-2xl border border-dashed font-bold", c.tableBorder)} style={{ fontSize: "min(2.4vw, 4dvh)" }}>
            아직 시간표가 없습니다. 잠시 후 다시 확인해 주세요.
          </p>
        ) : size.h > 0 ? (
          <div data-tv-blocks={blocks.length} className="grid h-full" style={{ gridTemplateColumns: `repeat(${blocks.length}, minmax(0, 1fr))`, columnGap: GAP }}>
            {blocks.map((block, bi) => (
              <table key={bi} style={{ borderSpacing: SPACING }} className={cn("w-full table-fixed border-separate self-start rounded-xl border", c.tableBorder)}>
                <colgroup>
                  <col style={{ width: `${LABEL_FRAC * 100}%` }} />
                </colgroup>
                <thead>
                  <tr style={{ height: layout.rowH }}>
                    <th className={cn("rounded-lg px-1 text-left font-black whitespace-nowrap", c.labelHead)} style={{ fontSize: labelHeadFont }}>
                      테이블
                    </th>
                    {cols.map(({ slot, index }) => (
                      <th
                        key={slot.at}
                        className={cn("truncate rounded-lg px-1 font-black whitespace-nowrap tabular-nums", index === next ? c.nextHead : c.nowHead)}
                        style={{ fontSize: headFont }}
                      >
                        {index === next ? "교대" : "지금"} {formatClock(slot.at)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {block.map(({ label, t }) => (
                    <tr key={label} data-tv-row={label} style={{ height: layout.rowH }}>
                      <th className={cn("rounded-lg px-[0.4vw] text-left font-black whitespace-nowrap", c.label)} style={{ fontSize: font }}>
                        {tableTag(label)}
                      </th>
                      {cols.map(({ slot, index }) => {
                        const text = cellText(t, slot.at, slot.seats[t]);
                        return (
                          <td
                            key={slot.at}
                            className={cn(
                              "truncate rounded-lg px-1 text-center font-black leading-none",
                              text === "컨바인" ? c.shut : index === next ? c.nextCell : c.nowCell,
                              text === "—" && c.empty,
                            )}
                            style={{ fontSize: font }}
                          >
                            {text}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            ))}
          </div>
        ) : null}
        {pageCount > 1 ? (
          <p data-tv-page className={cn("absolute right-1 bottom-0 rounded-md bg-black/70 px-2 font-black text-amber-300")} style={{ fontSize: "min(1.2vw, 2dvh)" }}>
            테이블 {pageIndex + 1}/{pageCount}쪽 · {pageSeconds}초마다 넘어가요
          </p>
        ) : null}
      </div>
    </div>
  );
}
