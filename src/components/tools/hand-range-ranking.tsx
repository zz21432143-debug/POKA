"use client";

import { useState } from "react";
import { HAND_NAMES, OPPONENT_OPTIONS, handCombos, ranking, topRange, type Opponents } from "@/lib/hand-ranking";
import { cn } from "cn";

/** 순위 색: 1위 진한 금색 → 169위 어둡게 */
function rankColor(rank: number) {
  const t = 1 - (rank - 1) / 168;
  return `rgba(201,162,92,${0.08 + t * 0.82})`;
}

/** 핸드 레인지 순위: 169개 패 표 + 상위 X% 범위 + 전체 순위 목록 */
export function HandRangeRanking() {
  const [opp, setOpp] = useState<Opponents>("1");
  const [pct, setPct] = useState(15);
  const [picked, setPicked] = useState<number>(HAND_NAMES.indexOf("AJo"));
  const [showAll, setShowAll] = useState(false);
  const r = ranking(opp);
  const range = topRange(pct, opp);
  const rangeCombos = [...range].reduce((sum, h) => sum + handCombos(HAND_NAMES[h]), 0);
  const tab = (active: boolean) => cn("inline-flex min-h-10 flex-1 items-center justify-center rounded-lg px-2 text-sm font-bold", active ? "bg-[#c9a25c] text-[#1d1611]" : "text-[#d1c7b5] hover:bg-white/10");
  const list = showAll ? r.order : r.order.slice(0, 30);

  return (
    <div data-hand-ranking className="grid grid-cols-[minmax(0,1fr)] gap-4">
      <section aria-label="조건" className="ink-panel grid gap-3 rounded-2xl p-4">
        <div role="tablist" aria-label="상대 수" className="flex gap-1 rounded-xl border border-white/10 bg-black/30 p-1">
          {OPPONENT_OPTIONS.map((o) => (
            <button key={o.key} type="button" role="tab" aria-selected={opp === o.key} data-hr-opp={o.key} onClick={() => setOpp(o.key)} className={tab(opp === o.key)}>
              {o.label}
            </button>
          ))}
        </div>
        <label className="grid gap-1.5">
          <span className="flex items-baseline justify-between text-sm font-bold text-[#e7c98a]">
            상위 범위
            <span data-hr-pct className="text-2xl font-black text-white tabular-nums">
              {pct}% <span className="text-sm font-bold text-[#9CA3AF]">· {range.size}가지 패 · {rangeCombos}조합</span>
            </span>
          </span>
          <input aria-label="상위 범위 %" type="range" min={1} max={100} step={1} value={pct} onChange={(e) => setPct(Number(e.target.value))} className="h-10 w-full accent-[#c9a25c]" />
          <div className="flex flex-wrap gap-1">
            {[5, 10, 15, 20, 30, 50].map((v) => (
              <button key={v} type="button" data-hr-preset={v} onClick={() => setPct(v)} className={cn("inline-flex min-h-9 items-center rounded-full border px-3 text-xs font-bold", pct === v ? "border-[#c9a25c] bg-[#c9a25c]/20 text-white" : "border-white/15 text-[#d1c7b5]")}>
                상위 {v}%
              </button>
            ))}
          </div>
        </label>
      </section>

      <section data-hr-answer aria-live="polite" className="rounded-2xl border-2 border-[#c9a25c]/60 bg-[#1d1611] p-4">
        <p className="text-sm text-[#d1c7b5]">선택한 패 · 칸을 눌러 바꿀 수 있어요</p>
        <p className="mt-1 flex flex-wrap items-baseline gap-x-3">
          <span className="text-2xl font-black text-white">{HAND_NAMES[picked]}</span>
          <span className="text-lg font-black text-[#f3d9a4]">{r.rank[picked]}위 / 169</span>
        </p>
        <p className="mt-1 text-[15px] text-[#ece4d6]">
          {OPPONENT_OPTIONS.find((o) => o.key === opp)?.label}와 끝까지 갔을 때 승률 <b className="text-white">{(r.equity[picked] * 100).toFixed(1)}%</b> · 상위 <b className="text-white">{r.topPct[picked].toFixed(1)}%</b> 안에 드는 패
        </p>
      </section>

      <figure className="grid gap-2">
        <figcaption className="flex flex-wrap items-baseline justify-between gap-2">
          <span className="text-base font-black text-white">순위 표 (칸 숫자 = 순위)</span>
          <span className="text-sm text-[#d1c7b5]">밝은 테두리 = 상위 {pct}% 범위</span>
        </figcaption>
        <div role="grid" aria-label="핸드 순위 표" className="grid gap-[2px] rounded-lg bg-black/40 p-[2px]" style={{ gridTemplateColumns: "repeat(13, minmax(0, 1fr))" }}>
          {HAND_NAMES.map((name, k) => {
            const inRange = range.has(k);
            return (
              <button
                key={name}
                type="button"
                role="gridcell"
                data-hand={name}
                data-in={inRange ? "1" : "0"}
                onClick={() => setPicked(k)}
                aria-label={`${name} ${r.rank[k]}위`}
                className={cn(
                  "flex aspect-square min-w-0 flex-col items-center justify-center rounded-[3px] leading-none text-[#fff6e6]",
                  inRange ? "outline-2 -outline-offset-2 outline-white" : "opacity-60",
                  picked === k && "ring-2 ring-[#ff8a8a]",
                )}
                style={{ background: rankColor(r.rank[k]) }}
              >
                <span className="text-[8px] font-bold sm:text-[11px]">{name}</span>
                <span className="text-[7px] font-black sm:text-[10px]">{r.rank[k]}</span>
              </button>
            );
          })}
        </div>
      </figure>

      <section aria-label="전체 순위" className="ink-panel grid gap-2 rounded-2xl p-4">
        <h2 className="text-lg font-black text-[#f3d9a4]">순위 목록</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[22rem] text-sm">
            <thead>
              <tr className="border-b border-white/15 text-left text-xs text-[#9CA3AF]">
                <th className="py-2 font-semibold">순위</th>
                <th className="py-2 font-semibold">패</th>
                <th className="py-2 text-right font-semibold">승률</th>
                <th className="py-2 text-right font-semibold">누적 상위</th>
              </tr>
            </thead>
            <tbody>
              {list.map((h) => (
                <tr key={h} data-hr-row className={cn("border-b border-white/5", range.has(h) ? "text-white" : "text-[#9CA3AF]")}>
                  <td className="py-1.5 font-black tabular-nums">{r.rank[h]}</td>
                  <td className="py-1.5">
                    <button type="button" onClick={() => setPicked(h)} className="inline-flex min-h-9 items-center font-bold hover:text-[#f3d9a4]">
                      {HAND_NAMES[h]}
                    </button>
                  </td>
                  <td className="py-1.5 text-right tabular-nums">{(r.equity[h] * 100).toFixed(1)}%</td>
                  <td className="py-1.5 text-right tabular-nums">{r.topPct[h].toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button type="button" data-hr-all onClick={() => setShowAll((v) => !v)} className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/15 text-sm font-bold text-[#d1c7b5] hover:border-[#c9a25c]">
          {showAll ? "30위까지만 보기" : "169위까지 전부 보기"}
        </button>
      </section>
    </div>
  );
}
