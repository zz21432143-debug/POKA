"use client";

import { useMemo, useState } from "react";
import rawData from "@/lib/data/pushfold-hu.json";
import { COMBOS, rowAt, thresholds, unpackSet, type PushFoldData } from "@/lib/pushfold";
import { cn } from "cn";

const data = rawData as PushFoldData;
type Side = "push" | "call";
type View = "range" | "numbers";

/** 숫자 표에서 칸 색: 큰 스택까지 할수록 진하게 */
function heat(v: number, max: number) {
  if (v <= 0) return "rgba(255,255,255,0.04)";
  const t = Math.min(1, v / max);
  return `rgba(201,162,92,${0.12 + t * 0.78})`;
}

function Grid({
  side,
  stack,
  mode,
  view,
  picked,
  onPick,
}: {
  side: Side;
  stack: number;
  mode: string;
  view: View;
  picked: number | null;
  onPick: (k: number) => void;
}) {
  const row = rowAt(data, mode, stack);
  const set = useMemo(() => (row ? unpackSet(row[side]) : new Set<number>()), [row, side]);
  const nums = useMemo(() => thresholds(data, mode, side), [mode, side]);
  const pct = row ? (side === "push" ? row.pushPct : row.callPct) : 0;
  const on = side === "push" ? "bg-[#b42b2b] text-white" : "bg-[#1f6f4a] text-white";
  return (
    <figure className="grid gap-2">
      <figcaption className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-base font-black text-white">{side === "push" ? "SB 올인(푸시)" : "BB 콜"}</span>
        <span className="text-sm text-[#d1c7b5]">
          {view === "range" ? (
            <>
              {stack}bb에서 <b className="text-white">{pct}%</b>
            </>
          ) : (
            "칸 숫자 = 이 스택(bb)까지"
          )}
        </span>
      </figcaption>
      <div role="grid" aria-label={side === "push" ? "SB 올인 차트" : "BB 콜 차트"} className="grid gap-[2px] rounded-lg bg-black/40 p-[2px]" style={{ gridTemplateColumns: "repeat(13, minmax(0, 1fr))" }}>
        {data.names.map((name, k) => {
          const inRange = set.has(k);
          const v = nums[k];
          return (
            <button
              key={name}
              type="button"
              role="gridcell"
              data-hand={name}
              data-in={view === "range" ? (inRange ? "1" : "0") : undefined}
              onClick={() => onPick(k)}
              aria-label={`${name} ${view === "range" ? (inRange ? (side === "push" ? "올인" : "콜") : "폴드") : `${v >= 25 ? "25bb 이상" : `${v}bb까지`}`}`}
              className={cn(
                "flex aspect-square min-w-0 flex-col items-center justify-center rounded-[3px] leading-none",
                view === "range" ? (inRange ? on : "bg-white/[0.06] text-[#8c8478]") : "text-[#fff6e6]",
                picked === k && "ring-2 ring-white",
              )}
              style={view === "numbers" ? { background: heat(v, 25) } : undefined}
            >
              <span className="text-[8px] font-bold sm:text-[11px]">{name}</span>
              {view === "numbers" ? <span className="text-[7px] font-black sm:text-[10px]">{v >= 25 ? "25+" : v > 0 ? v : "—"}</span> : null}
            </button>
          );
        })}
      </div>
    </figure>
  );
}

/** 헤즈업 푸시/폴드 내시 차트: 스택 · 앤티를 고르면 SB 올인 범위와 BB 콜 범위 */
export function PushFoldChart() {
  const [mode, setMode] = useState<string>("none");
  const [stack, setStack] = useState(10);
  const [view, setView] = useState<View>("range");
  const [picked, setPicked] = useState<number | null>(data.names.indexOf("K2o"));
  const ante = data.modes[mode]?.ante ?? 0;
  const minStack = ante > 0 ? 1.1 + ante : 1;
  const s = Math.max(minStack, Math.min(25, Math.round(stack * 10) / 10));
  const row = rowAt(data, mode, s);
  const pushNums = useMemo(() => thresholds(data, mode, "push"), [mode]);
  const callNums = useMemo(() => thresholds(data, mode, "call"), [mode]);
  const pickedName = picked == null ? null : data.names[picked];
  const pushNow = picked != null && row ? unpackSet(row.push).has(picked) : false;
  const callNow = picked != null && row ? unpackSet(row.call).has(picked) : false;
  const tab = (active: boolean) => cn("inline-flex min-h-10 flex-1 items-center justify-center rounded-lg px-3 text-sm font-bold", active ? "bg-[#c9a25c] text-[#1d1611]" : "text-[#d1c7b5] hover:bg-white/10");
  const label = (v: number) => (v >= 25 ? "25bb 이상" : v > 0 ? `${v}bb까지` : "하지 않음");

  return (
    <div data-pushfold className="grid grid-cols-[minmax(0,1fr)] gap-4">
      <section aria-label="조건" className="ink-panel grid gap-3 rounded-2xl p-4">
        <div className="grid gap-2 sm:grid-cols-2">
          <div role="tablist" aria-label="앤티" className="flex gap-1 rounded-xl border border-white/10 bg-black/30 p-1">
            {Object.entries(data.modes).map(([key, m]) => (
              <button key={key} type="button" role="tab" aria-selected={mode === key} data-pf-mode={key} onClick={() => setMode(key)} className={tab(mode === key)}>
                {m.label}
              </button>
            ))}
          </div>
          <div role="tablist" aria-label="보기" className="flex gap-1 rounded-xl border border-white/10 bg-black/30 p-1">
            <button type="button" role="tab" aria-selected={view === "range"} data-pf-view="range" onClick={() => setView("range")} className={tab(view === "range")}>
              이 스택 범위
            </button>
            <button type="button" role="tab" aria-selected={view === "numbers"} data-pf-view="numbers" onClick={() => setView("numbers")} className={tab(view === "numbers")}>
              최대 스택 숫자표
            </button>
          </div>
        </div>
        {view === "range" ? (
          <label className="grid gap-1.5">
            <span className="flex items-baseline justify-between text-sm font-bold text-[#e7c98a]">
              유효 스택(둘 중 작은 쪽)
              <span className="text-2xl font-black text-white tabular-nums">{s}bb</span>
            </span>
            <input aria-label="유효 스택" type="range" min={minStack} max={25} step={0.1} value={s} onChange={(e) => setStack(Number(e.target.value))} className="h-10 w-full accent-[#c9a25c]" />
            <div className="flex flex-wrap gap-1">
              {[3, 5, 8, 10, 12, 15, 20, 25].map((v) => (
                <button key={v} type="button" data-pf-stack={v} onClick={() => setStack(v)} className={cn("inline-flex min-h-9 items-center rounded-full border px-3 text-xs font-bold", s === v ? "border-[#c9a25c] bg-[#c9a25c]/20 text-white" : "border-white/15 text-[#d1c7b5]")}>
                  {v}bb
                </button>
              ))}
            </div>
          </label>
        ) : null}
      </section>

      {pickedName ? (
        <section data-pf-answer aria-live="polite" className="rounded-2xl border-2 border-[#c9a25c]/60 bg-[#1d1611] p-4">
          <p className="text-sm text-[#d1c7b5]">선택한 패 · 칸을 눌러 바꿀 수 있어요</p>
          <p className="mt-1 text-2xl font-black text-white">{pickedName}</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <p className="rounded-xl bg-black/30 p-3 text-[15px]">
              <b className="text-[#ffb3b3]">SB</b> · {view === "range" ? (
                <>
                  {s}bb에서 <b className={pushNow ? "text-[#ff8a8a]" : "text-[#9CA3AF]"}>{pushNow ? "올인" : "폴드"}</b> ·{" "}
                </>
              ) : null}
              올인은 <b className="text-white">{label(pushNums[picked!])}</b>
            </p>
            <p className="rounded-xl bg-black/30 p-3 text-[15px]">
              <b className="text-[#9be3bd]">BB</b> · {view === "range" ? (
                <>
                  {s}bb에서 <b className={callNow ? "text-[#7fe0ae]" : "text-[#9CA3AF]"}>{callNow ? "콜" : "폴드"}</b> ·{" "}
                </>
              ) : null}
              콜은 <b className="text-white">{label(callNums[picked!])}</b>
            </p>
          </div>
          <p className="mt-2 text-xs text-[#9CA3AF]">
            이 패는 1,326개 조합 중 {COMBOS(pickedName)}개({((COMBOS(pickedName) / 1326) * 100).toFixed(2)}%)예요.
          </p>
        </section>
      ) : null}

      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-2">
        <Grid side="push" stack={s} mode={mode} view={view} picked={picked} onPick={setPicked} />
        <Grid side="call" stack={s} mode={mode} view={view} picked={picked} onPick={setPicked} />
      </div>
    </div>
  );
}
