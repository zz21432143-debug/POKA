"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2Icon } from "lucide-react";
import rawData from "@/lib/data/pushfold-hu.json";
import { COMBOS, rowAt, thresholds, unpackSet, type PushFoldData } from "@/lib/pushfold";
import { cn } from "cn";
import { IcmPushFold } from "@/components/tools/icm-push-fold";
import { drawRangeImage, shareBlob } from "@/lib/share-image";

const hu = rawData as PushFoldData;
const NAMES = hu.names;
type View = "range" | "numbers";
type Tab = "hu" | "pos" | "icm";

/** 포지션별 데이터(public/data/gto-positions.json) */
type PosRow = { s: number; push: string; pushPct: number; calls: Record<string, { set: string; pct: number }> } | null;
type PosData = {
  generatedFrom: string;
  names: string[];
  stacks: number[];
  positions: Record<string, string[]>;
  modes: Record<string, { label: string; ante: number; tables: Record<string, Record<string, PosRow[]>> }>;
};

/** 숫자 표 칸 색: 큰 스택까지 할수록 진하게 */
function heat(v: number, max: number) {
  if (v <= 0) return "rgba(255,255,255,0.04)";
  return `rgba(201,162,92,${0.12 + Math.min(1, v / max) * 0.78})`;
}

function RangeGrid({
  title,
  sub,
  ariaLabel,
  tone,
  set,
  nums,
  view,
  picked,
  onPick,
  compare,
}: {
  title: string;
  sub: string;
  ariaLabel: string;
  tone: "push" | "call";
  set: Set<number>;
  nums: number[];
  view: View;
  picked: number | null;
  onPick: (k: number) => void;
  /** 비교 범위(여기 들었지만 이 범위엔 없는 패는 점선) */
  compare?: Set<number>;
}) {
  const on = tone === "push" ? "bg-[#b42b2b] text-white" : "bg-[#1f6f4a] text-white";
  return (
    <figure className="grid gap-2">
      <figcaption className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-base font-black text-white">{title}</span>
        <span className="text-sm text-[#d1c7b5]">{sub}</span>
      </figcaption>
      <div role="grid" aria-label={ariaLabel} className="grid gap-[2px] rounded-lg bg-black/40 p-[2px]" style={{ gridTemplateColumns: "repeat(13, minmax(0, 1fr))" }}>
        {NAMES.map((name, k) => {
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
              aria-label={`${name} ${view === "range" ? (inRange ? (tone === "push" ? "올인" : "콜") : "폴드") : v >= 25 ? "25bb 이상" : `${v}bb까지`}`}
              className={cn(
                "flex aspect-square min-w-0 flex-col items-center justify-center rounded-[3px] leading-none",
                view === "range" ? (inRange ? on : "bg-white/[0.06] text-[#8c8478]") : "text-[#fff6e6]",
                picked === k && "ring-2 ring-white",
                compare && view === "range" && !inRange && compare.has(k) && "outline-2 -outline-offset-2 outline-dashed outline-[#e7c98a]",
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

const EMPTY_NUMS = new Array<number>(169).fill(0);
const label = (v: number) => (v >= 25 ? "25bb 이상" : v > 0 ? `${v}bb까지` : "하지 않음");
const tabCls = (active: boolean) => cn("inline-flex min-h-10 flex-1 items-center justify-center rounded-lg px-3 text-sm font-bold", active ? "bg-[#c9a25c] text-[#1d1611]" : "text-[#d1c7b5] hover:bg-white/10");
const chipCls = (active: boolean) => cn("inline-flex min-h-10 items-center rounded-full border px-3 text-sm font-bold", active ? "border-[#c9a25c] bg-[#c9a25c]/25 text-white" : "border-white/15 text-[#d1c7b5] hover:border-[#c9a25c]/60");

function StackPicker({ value, min, max, step, onChange }: { value: number; min: number; max: number; step: number; onChange: (v: number) => void }) {
  return (
    <label className="grid gap-1.5">
      <span className="flex items-baseline justify-between text-sm font-bold text-[#e7c98a]">
        유효 스택(둘 중 작은 쪽)
        <span className="text-2xl font-black text-white tabular-nums">{value}bb</span>
      </span>
      <input aria-label="유효 스택" type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="h-10 w-full accent-[#c9a25c]" />
      <div className="flex flex-wrap gap-1">
        {[3, 5, 8, 10, 12, 15, 20, 25]
          .filter((v) => v >= min)
          .map((v) => (
            <button key={v} type="button" data-pf-stack={v} onClick={() => onChange(v)} className={cn("inline-flex min-h-9 items-center rounded-full border px-3 text-xs font-bold", value === v ? "border-[#c9a25c] bg-[#c9a25c]/20 text-white" : "border-white/15 text-[#d1c7b5]")}>
              {v}bb
            </button>
          ))}
      </div>
    </label>
  );
}

type Line = { who: string; tone: string; now?: string; nowOn?: boolean; max: string };

function Answer({ name, lines }: { name: string; lines: Line[] }) {
  return (
    <section data-pf-answer aria-live="polite" className="rounded-2xl border-2 border-[#c9a25c]/60 bg-[#1d1611] p-4">
      <p className="text-sm text-[#d1c7b5]">선택한 패 · 칸을 눌러 바꿀 수 있어요</p>
      <p className="mt-1 text-2xl font-black text-white">{name}</p>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        {lines.map((line) => (
          <p key={line.who} className="rounded-xl bg-black/30 p-3 text-[15px]">
            <b className={line.tone}>{line.who}</b> ·{" "}
            {line.now ? (
              <>
                {line.now} <b className={line.nowOn ? "text-white" : "text-[#9CA3AF]"}>{line.nowOn ? "한다" : "안 한다"}</b> ·{" "}
              </>
            ) : null}
            <b className="text-white">{line.max}</b>
          </p>
        ))}
      </div>
      <p className="mt-2 text-xs text-[#9CA3AF]">
        이 패는 1,326개 조합 중 {COMBOS(name)}개({((COMBOS(name) / 1326) * 100).toFixed(2)}%)예요.
      </p>
    </section>
  );
}

/** 헤즈업(SB vs BB) 0.1bb */
function HeadsUp({ mode, view }: { mode: string; view: View }) {
  const [stack, setStack] = useState(10);
  const [picked, setPicked] = useState<number | null>(NAMES.indexOf("K2o"));
  const ante = hu.modes[mode]?.ante ?? 0;
  const minStack = ante > 0 ? 1.1 + ante : 1;
  const s = Math.max(minStack, Math.min(25, Math.round(stack * 10) / 10));
  const row = rowAt(hu, mode, s);
  const pushSet = useMemo(() => (row ? unpackSet(row.push) : new Set<number>()), [row]);
  const callSet = useMemo(() => (row ? unpackSet(row.call) : new Set<number>()), [row]);
  const pushNums = useMemo(() => thresholds(hu, mode, "push"), [mode]);
  const callNums = useMemo(() => thresholds(hu, mode, "call"), [mode]);
  return (
    <>
      {view === "range" ? (
        <section aria-label="스택" className="ink-panel rounded-2xl p-4">
          <StackPicker value={s} min={minStack} max={25} step={0.1} onChange={setStack} />
        </section>
      ) : null}
      {picked != null ? (
        <Answer
          name={NAMES[picked]}
          lines={[
            { who: "SB 올인", tone: "text-[#ffb3b3]", now: view === "range" ? `${s}bb에서` : undefined, nowOn: pushSet.has(picked), max: label(pushNums[picked]) },
            { who: "BB 콜", tone: "text-[#9be3bd]", now: view === "range" ? `${s}bb에서` : undefined, nowOn: callSet.has(picked), max: label(callNums[picked]) },
          ]}
        />
      ) : null}
      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-2">
        <RangeGrid title="SB 올인(푸시)" sub={view === "range" ? `${s}bb · ${row?.pushPct ?? 0}%` : "칸 숫자 = 이 스택(bb)까지"} ariaLabel="SB 올인 차트" tone="push" set={pushSet} nums={pushNums} view={view} picked={picked} onPick={setPicked} />
        <RangeGrid title="BB 콜" sub={view === "range" ? `${s}bb · ${row?.callPct ?? 0}%` : "칸 숫자 = 이 스택(bb)까지"} ariaLabel="BB 콜 차트" tone="call" set={callSet} nums={callNums} view={view} picked={picked} onPick={setPicked} />
      </div>
    </>
  );
}

/** 포지션별(6인 · 9인) 0.5bb */
function Positions({ mode, view }: { mode: string; view: View }) {
  const [data, setData] = useState<PosData | null>(null);
  const [error, setError] = useState(false);
  const [size, setSize] = useState<"6" | "9">("9");
  const [pusher, setPusher] = useState("BTN");
  const [caller, setCaller] = useState("BB");
  const [stack, setStack] = useState(10);
  const [picked, setPicked] = useState<number | null>(NAMES.indexOf("K9o"));
  const [shareNote, setShareNote] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    fetch("/data/gto-positions.json")
      .then((r) => (r.ok ? (r.json() as Promise<PosData>) : Promise.reject(new Error("load"))))
      .then((d) => {
        if (alive) setData(d);
      })
      .catch(() => {
        if (alive) setError(true);
      });
    return () => {
      alive = false;
    };
  }, []);
  const positions = data?.positions[size] ?? [];
  const pushers = positions.slice(0, -1);
  const pusherName = pushers.includes(pusher) ? pusher : "BTN";
  const callers = positions.slice(positions.indexOf(pusherName) + 1);
  const callerName = callers.includes(caller) ? caller : (callers[callers.length - 1] ?? "BB");
  const rows = data?.modes[mode]?.tables[size]?.[pusherName] ?? [];
  const s = Math.max(2, Math.min(25, Math.round(stack * 2) / 2));
  const row = rows.find((r) => r && r.s === s) ?? null;
  const pushSet = row ? unpackSet(row.push) : new Set<number>();
  const callSet = row?.calls[callerName] ? unpackSet(row.calls[callerName].set) : new Set<number>();
  // 스택별 줄을 훑어 패마다 "몇 bb까지"(가벼운 계산이라 매번 다시 함)
  const nums = (() => {
    const push = new Array<number>(169).fill(0);
    const call = new Array<number>(169).fill(0);
    for (const r of rows) {
      if (!r) continue;
      for (const k of unpackSet(r.push)) push[k] = Math.max(push[k], r.s);
      const c = r.calls[callerName];
      if (c) for (const k of unpackSet(c.set)) call[k] = Math.max(call[k], r.s);
    }
    return { push, call };
  })();

  if (error) return <p className="rounded-2xl bg-black/30 p-4 text-sm text-rose-300">포지션 차트를 불러오지 못했어요. 새로고침해 주세요.</p>;
  if (!data) {
    return (
      <p className="flex items-center gap-2 rounded-2xl bg-black/30 p-4 text-sm text-[#d1c7b5]">
        <Loader2Icon className="size-4 animate-spin" />
        포지션 차트를 불러오는 중…
      </p>
    );
  }
  return (
    <>
      <section aria-label="포지션" className="ink-panel grid gap-3 rounded-2xl p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-bold text-[#e7c98a]">테이블</span>
          {(["9", "6"] as const).map((n) => (
            <button key={n} type="button" data-pf-size={n} onClick={() => setSize(n)} className={chipCls(size === n)}>
              {n}인
            </button>
          ))}
        </div>
        <div className="grid gap-1.5">
          <span className="text-sm font-bold text-[#e7c98a]">먼저 올인하는 자리(앞사람은 모두 폴드)</span>
          <div className="flex flex-wrap gap-1.5">
            {pushers.map((p) => (
              <button key={p} type="button" data-pf-pusher={p} onClick={() => setPusher(p)} className={chipCls(pusherName === p)}>
                {p}
              </button>
            ))}
          </div>
        </div>
        <div className="grid gap-1.5">
          <span className="text-sm font-bold text-[#e7c98a]">콜 범위를 볼 자리</span>
          <div className="flex flex-wrap gap-1.5">
            {callers.map((p) => (
              <button key={p} type="button" data-pf-caller={p} onClick={() => setCaller(p)} className={chipCls(callerName === p)}>
                {p}
              </button>
            ))}
          </div>
        </div>
        {view === "range" ? <StackPicker value={s} min={2} max={25} step={0.5} onChange={setStack} /> : null}
      </section>
      {picked != null ? (
        <Answer
          name={NAMES[picked]}
          lines={[
            { who: `${pusherName} 올인`, tone: "text-[#ffb3b3]", now: view === "range" ? `${s}bb에서` : undefined, nowOn: pushSet.has(picked), max: label(nums.push[picked]) },
            { who: `${callerName} 콜(vs ${pusherName})`, tone: "text-[#9be3bd]", now: view === "range" ? `${s}bb에서` : undefined, nowOn: callSet.has(picked), max: label(nums.call[picked]) },
          ]}
        />
      ) : null}
      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-2">
        <RangeGrid title={`${pusherName} 올인(푸시)`} sub={view === "range" ? `${s}bb · ${row?.pushPct ?? 0}%` : "칸 숫자 = 이 스택(bb)까지"} ariaLabel="포지션 올인 차트" tone="push" set={pushSet} nums={nums.push} view={view} picked={picked} onPick={setPicked} />
        <RangeGrid title={`${callerName} 콜 (vs ${pusherName} 올인)`} sub={view === "range" ? `${s}bb · ${row?.calls[callerName]?.pct ?? 0}%` : "칸 숫자 = 이 스택(bb)까지"} ariaLabel="포지션 콜 차트" tone="call" set={callSet} nums={nums.call} view={view} picked={picked} onPick={setPicked} />
      </div>
      {view === "range" ? (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            data-share-range
            onClick={async () => {
              const blob = await drawRangeImage({
                title: "GTO 푸시폴드",
                subtitle: `${size}인 · ${s}bb · ${pusherName} 올인 / ${callerName} 콜`,
                grids: [
                  { label: `${pusherName} 올인 · ${row?.pushPct ?? 0}%`, set: pushSet, color: "#b42b2b" },
                  { label: `${callerName} 콜 · ${row?.calls[callerName]?.pct ?? 0}%`, set: callSet, color: "#1f6f4a" },
                ],
                names: NAMES,
                url: "pokerwiki.co.kr/info/push-fold",
              }).catch(() => null);
              const done = await shareBlob(blob, { title: "GTO 푸시폴드 차트", url: "pokerwiki.co.kr/info/push-fold", fileName: `POKA_푸시폴드_${pusherName}_${s}bb` });
              setShareNote(done === "shared" ? "공유했어요" : done === "downloaded" ? "이미지를 저장했어요" : "이미지를 만들지 못했어요");
            }}
            className="min-h-11 rounded-xl bg-[#FEE500] px-4 text-sm font-black text-black"
          >
            📤 이 차트 이미지로 공유
          </button>
          {shareNote ? <span className="text-xs text-[#d1c7b5]">{shareNote}</span> : null}
        </div>
      ) : null}
      <p className="text-xs leading-5 text-[#9CA3AF]">모두 같은 스택이라고 보고, 한 명이 콜하면 나머지는 폴드한다고 계산했어요(숏스택 차트에서 흔히 쓰는 근사). 0.5bb 간격이에요.</p>
    </>
  );
}

/** GTO 푸시폴드 차트: 포지션별 · 헤즈업 */
export function PushFoldChart() {
  const [tab, setTab] = useState<Tab>("pos");
  const [mode, setMode] = useState<string>("none");
  const [view, setView] = useState<View>("range");
  return (
    <div data-pushfold className="grid grid-cols-[minmax(0,1fr)] gap-4">
      <section aria-label="조건" className="ink-panel grid gap-2 rounded-2xl p-4">
        <div role="tablist" aria-label="차트 종류" className="flex gap-1 rounded-xl border border-white/10 bg-black/30 p-1">
          <button type="button" role="tab" aria-selected={tab === "pos"} data-pf-tab="pos" onClick={() => setTab("pos")} className={tabCls(tab === "pos")}>
            포지션별 (6인 · 9인)
          </button>
          <button type="button" role="tab" aria-selected={tab === "hu"} data-pf-tab="hu" onClick={() => setTab("hu")} className={tabCls(tab === "hu")}>
            헤즈업
          </button>
          <button type="button" role="tab" aria-selected={tab === "icm"} data-pf-tab="icm" onClick={() => setTab("icm")} className={tabCls(tab === "icm")}>
            ICM(버블·파이널)
          </button>
        </div>
        <div className={cn("grid gap-2 sm:grid-cols-2", tab === "icm" && "hidden")}>
          <div role="tablist" aria-label="앤티" className="flex gap-1 rounded-xl border border-white/10 bg-black/30 p-1">
            {Object.entries(hu.modes).map(([key, m]) => (
              <button key={key} type="button" role="tab" aria-selected={mode === key} data-pf-mode={key} onClick={() => setMode(key)} className={tabCls(mode === key)}>
                {m.label}
              </button>
            ))}
          </div>
          <div role="tablist" aria-label="보기" className="flex gap-1 rounded-xl border border-white/10 bg-black/30 p-1">
            <button type="button" role="tab" aria-selected={view === "range"} data-pf-view="range" onClick={() => setView("range")} className={tabCls(view === "range")}>
              이 스택 범위
            </button>
            <button type="button" role="tab" aria-selected={view === "numbers"} data-pf-view="numbers" onClick={() => setView("numbers")} className={tabCls(view === "numbers")}>
              최대 스택 숫자표
            </button>
          </div>
        </div>
      </section>
      {tab === "icm" ? (
        <IcmPushFold renderGrid={(g) => <RangeGrid {...g} nums={EMPTY_NUMS} view="range" />} />
      ) : tab === "hu" ? (
        <HeadsUp mode={mode} view={view} />
      ) : (
        <Positions mode={mode} view={view} />
      )}
    </div>
  );
}
