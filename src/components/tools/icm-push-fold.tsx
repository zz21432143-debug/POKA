"use client";

import { useEffect, useState } from "react";
import { Loader2Icon, MinusIcon, PlusIcon } from "lucide-react";
import { parseAmount } from "@/lib/icm";
import { seatNames, solveIcmPushFold, type EqTable, type IcmResult } from "@/lib/icm-pushfold";
import { cn } from "cn";

const ITERATIONS = 2000;
const chipText = (raw: string) => {
  const digits = raw.replace(/[^0-9]/g, "").slice(0, 12);
  return digits ? Number(digits).toLocaleString("ko-KR") : "";
};
const num = (raw: string) => Number(raw.replace(/[^0-9.]/g, "")) || 0;
const combosOf = (name: string) => (name.length === 2 ? 6 : name.endsWith("s") ? 4 : 12);

/** ICM 푸시폴드: 스택 · 상금 · 블라인드를 넣으면 버블 · 파이널에서의 올인/콜 범위(칩 기준과 비교) */
export function IcmPushFold({
  renderGrid,
}: {
  renderGrid: (props: { title: string; sub: string; ariaLabel: string; tone: "push" | "call"; set: Set<number>; compare?: Set<number>; picked: number | null; onPick: (k: number) => void }) => React.ReactNode;
}) {
  const [table, setTable] = useState<EqTable | null>(null);
  const [error, setError] = useState(false);
  const [stacks, setStacks] = useState(["10,000", "10,000", "10,000", "10,000"]);
  const [sb, setSb] = useState("500");
  const [bb, setBb] = useState("1,000");
  const [ante, setAnte] = useState(false);
  const [payouts, setPayouts] = useState(["50", "30", "20"]);
  const [pusher, setPusher] = useState(1);
  const [caller, setCaller] = useState(3);
  const [busy, setBusy] = useState<number | null>(null);
  const [result, setResult] = useState<{ icm: IcmResult; chips: IcmResult; pusher: number; seats: string[] } | null>(null);
  const [showChips, setShowChips] = useState(false);
  const [picked, setPicked] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/data/preflop-eq.json")
      .then((r) => (r.ok ? (r.json() as Promise<EqTable>) : Promise.reject(new Error("load"))))
      .then((d) => {
        if (alive) setTable(d);
      })
      .catch(() => {
        if (alive) setError(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  const n = stacks.length;
  const seats = seatNames(n);
  const p = Math.min(pusher, n - 2);
  const callerSeat = caller > p && caller < n ? caller : n - 1;
  const bbNum = num(bb);
  const prizeList = payouts.map((v) => parseAmount(v)).filter((v) => Number.isFinite(v) && v > 0);
  const stackNums = stacks.map(num);
  const ready = Boolean(table) && stackNums.every((s) => s > bbNum) && bbNum > 0 && num(sb) > 0 && prizeList.length > 0;

  function setCount(next: number) {
    const c = Math.max(2, Math.min(9, next));
    setStacks((prev) => (c > prev.length ? [...prev, ...Array(c - prev.length).fill(prev[prev.length - 1] ?? "10,000")] : prev.slice(0, c)));
    setResult(null);
  }
  async function run() {
    if (!table || !ready) return;
    setBusy(0);
    setResult(null);
    const spot = { stacks: stackNums, sb: num(sb), bb: bbNum, ante: ante ? bbNum : 0, payouts: prizeList, pusher: p };
    const icm = await solveIcmPushFold(table, { ...spot, utility: "icm" }, ITERATIONS, (f) => setBusy(f * 50));
    const chips = await solveIcmPushFold(table, { ...spot, utility: "chips" }, ITERATIONS, (f) => setBusy(50 + f * 50));
    setResult({ icm, chips, pusher: p, seats });
    setBusy(null);
    setPicked(null);
  }

  const field = "h-11 w-full min-w-0 rounded-xl border border-white/15 bg-black/40 px-3 text-right text-[15px] text-white tabular-nums focus:border-[#c9a25c] focus:outline-none";
  const chip = (on: boolean) => cn("inline-flex min-h-10 items-center rounded-full border px-3 text-sm font-bold", on ? "border-[#c9a25c] bg-[#c9a25c]/25 text-white" : "border-white/15 text-[#d1c7b5] hover:border-[#c9a25c]/60");

  if (error) return <p className="rounded-2xl bg-black/30 p-4 text-sm text-rose-300">승률표를 불러오지 못했어요. 새로고침해 주세요.</p>;

  const resIcmCall = result?.icm.calls.find((c) => c.seat === callerSeat);
  const resChipCall = result?.chips.calls.find((c) => c.seat === callerSeat);
  const shown = showChips ? result?.chips : result?.icm;
  const shownCall = showChips ? resChipCall : resIcmCall;

  return (
    <>
      <section aria-label="ICM 조건" className="ink-panel grid gap-3 rounded-2xl p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-bold text-[#e7c98a]">남은 인원</span>
          <button type="button" aria-label="인원 줄이기" onClick={() => setCount(n - 1)} className="inline-flex size-10 items-center justify-center rounded-lg border border-white/15">
            <MinusIcon className="size-4" />
          </button>
          <span data-icmpf-count className="min-w-[3rem] text-center text-lg font-black text-white">{n}명</span>
          <button type="button" aria-label="인원 늘리기" onClick={() => setCount(n + 1)} className="inline-flex size-10 items-center justify-center rounded-lg border border-white/15">
            <PlusIcon className="size-4" />
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <label className="grid gap-1 text-xs font-bold text-[#9CA3AF]">
            SB
            <input aria-label="SB" value={sb} onChange={(e) => setSb(chipText(e.target.value))} className={field} />
          </label>
          <label className="grid gap-1 text-xs font-bold text-[#9CA3AF]">
            BB
            <input aria-label="BB" value={bb} onChange={(e) => setBb(chipText(e.target.value))} className={field} />
          </label>
          <label className="grid gap-1 text-xs font-bold text-[#9CA3AF]">
            BB 앤티
            <button type="button" data-icmpf-ante onClick={() => setAnte((v) => !v)} className={cn("h-11 rounded-xl border text-sm font-bold", ante ? "border-[#c9a25c] bg-[#c9a25c]/25 text-white" : "border-white/15 text-[#d1c7b5]")}>
              {ante ? "있음(=BB)" : "없음"}
            </button>
          </label>
        </div>
        <div className="grid gap-1.5">
          <span className="text-sm font-bold text-[#e7c98a]">자리별 스택(칩) · 행동 순서</span>
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {stacks.map((s, i) => (
              <li key={i} className="grid grid-cols-[3.4rem_minmax(0,1fr)] items-center gap-1.5">
                <span className="text-sm font-black text-[#f3d9a4]">{seats[i]}</span>
                <input aria-label={`${seats[i]} 스택`} inputMode="numeric" value={s} onChange={(e) => setStacks((prev) => prev.map((v, j) => (j === i ? chipText(e.target.value) : v)))} className={field} />
              </li>
            ))}
          </ul>
          {bbNum > 0 ? <p className="text-xs text-[#9CA3AF]">스택(BB): {stackNums.map((v, i) => `${seats[i]} ${Math.round((v / bbNum) * 10) / 10}`).join(" · ")}</p> : null}
        </div>
        <div className="grid gap-1.5">
          <span className="text-sm font-bold text-[#e7c98a]">남은 순위별 상금(금액 또는 비율 — 같은 단위로)</span>
          <ul className="flex flex-wrap gap-2">
            {payouts.map((v, i) => (
              <li key={i} className="grid grid-cols-[2.4rem_6rem] items-center gap-1">
                <span className="text-sm font-black text-[#e7c98a]">{i + 1}위</span>
                <input aria-label={`${i + 1}위 상금`} value={v} onChange={(e) => setPayouts((prev) => prev.map((x, j) => (j === i ? e.target.value : x)))} className={field} />
              </li>
            ))}
            <li className="flex gap-1">
              <button type="button" aria-label="상금 순위 빼기" onClick={() => setPayouts((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev))} className="inline-flex size-11 items-center justify-center rounded-xl border border-white/15">
                <MinusIcon className="size-4" />
              </button>
              <button type="button" aria-label="상금 순위 추가" onClick={() => setPayouts((prev) => (prev.length < 9 ? [...prev, ""] : prev))} className="inline-flex size-11 items-center justify-center rounded-xl border border-white/15">
                <PlusIcon className="size-4" />
              </button>
            </li>
          </ul>
          <p className="text-xs text-[#9CA3AF]">버블이면 상금 받는 순위가 남은 인원보다 적어요(예: 4명 남고 3위까지 상금).</p>
        </div>
        <div className="grid gap-1.5">
          <span className="text-sm font-bold text-[#e7c98a]">먼저 올인하는 자리</span>
          <div className="flex flex-wrap gap-1.5">
            {seats.slice(0, -1).map((name, i) => (
              <button key={name} type="button" data-icmpf-pusher={name} onClick={() => setPusher(i)} className={chip(p === i)}>
                {name}
              </button>
            ))}
          </div>
        </div>
        <button type="button" data-icmpf-run disabled={!ready || busy !== null} onClick={() => void run()} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#c9a25c] px-5 text-base font-black text-[#1d1611] disabled:opacity-50">
          {busy !== null ? (
            <>
              <Loader2Icon className="size-5 animate-spin" />
              계산 중 {Math.round(busy)}%
            </>
          ) : !table ? (
            "승률표 불러오는 중…"
          ) : (
            "ICM 범위 계산하기"
          )}
        </button>
        <p className="text-xs leading-5 text-[#9CA3AF]">
          인원이 많을수록 오래 걸려요(9명 기준 PC 5~10초 · 휴대폰 20초 안팎). 같은 조건을 칩 기준으로도 함께 계산해 비교해 드려요.
        </p>
      </section>

      {result ? (
        <>
          <section data-icmpf-summary aria-live="polite" className="rounded-2xl border-2 border-[#c9a25c]/60 bg-[#1d1611] p-4">
            <p className="text-sm text-[#d1c7b5]">결과 · {result.seats[result.pusher]} 먼저 올인</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <p className="rounded-xl bg-black/30 p-3 text-[15px]">
                <b className="text-[#ffb3b3]">{result.seats[result.pusher]} 올인</b> · ICM <b className="text-white">{result.icm.pushPct}%</b> <span className="text-[#9CA3AF]">(칩 기준 {result.chips.pushPct}%)</span>
              </p>
              <p className="rounded-xl bg-black/30 p-3 text-[15px]">
                <b className="text-[#9be3bd]">{result.seats[callerSeat]} 콜</b> · ICM <b className="text-white">{resIcmCall?.pct ?? 0}%</b> <span className="text-[#9CA3AF]">(칩 기준 {resChipCall?.pct ?? 0}%)</span>
              </p>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-sm font-bold text-[#e7c98a]">콜 범위를 볼 자리</span>
              {result.seats.slice(result.pusher + 1).map((name, j) => (
                <button key={name} type="button" data-icmpf-caller={name} onClick={() => setCaller(result.pusher + 1 + j)} className={chip(callerSeat === result.pusher + 1 + j)}>
                  {name}
                </button>
              ))}
              <label className="ml-auto inline-flex min-h-10 items-center gap-2 text-sm font-bold text-[#d1c7b5]">
                <input type="checkbox" checked={showChips} onChange={(e) => setShowChips(e.target.checked)} className="size-4" data-icmpf-chips />
                칩 기준으로 보기
              </label>
            </div>
            {picked != null && table ? (
              <p className="mt-2 text-[15px] text-[#ece4d6]">
                <b className="text-white">{table.names[picked]}</b> · 올인 ICM {result.icm.push.has(picked) ? "한다" : "안 한다"}(칩 {result.chips.push.has(picked) ? "한다" : "안 한다"}) · 콜 ICM{" "}
                {resIcmCall?.set.has(picked) ? "한다" : "안 한다"}(칩 {resChipCall?.set.has(picked) ? "한다" : "안 한다"}) · {combosOf(table.names[picked])}조합
              </p>
            ) : null}
          </section>
          {shown ? (
            <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-2">
              {renderGrid({
                title: `${result.seats[result.pusher]} 올인 (${showChips ? "칩" : "ICM"})`,
                sub: `${shown.pushPct}% · 점선 = ${showChips ? "ICM" : "칩 기준"}에선 올인`,
                ariaLabel: "ICM 올인 차트",
                tone: "push",
                set: shown.push,
                compare: showChips ? result.icm.push : result.chips.push,
                picked,
                onPick: setPicked,
              })}
              {renderGrid({
                title: `${result.seats[callerSeat]} 콜 (${showChips ? "칩" : "ICM"})`,
                sub: `${shownCall?.pct ?? 0}% · 점선 = ${showChips ? "ICM" : "칩 기준"}에선 콜`,
                ariaLabel: "ICM 콜 차트",
                tone: "call",
                set: shownCall?.set ?? new Set<number>(),
                compare: (showChips ? resIcmCall : resChipCall)?.set,
                picked,
                onPick: setPicked,
              })}
            </div>
          ) : null}
          <p className="text-xs leading-5 text-[#9CA3AF]">
            ICM 범위는 상금 가치로 손익을 따진 균형이에요. 한 명이 콜하면 나머지는 폴드하고, 폴드한 사람의 가치는 올인한 사람이 블라인드를 가져간 뒤로 근사했어요. 반복 {ITERATIONS}번으로 계산합니다.
          </p>
        </>
      ) : null}
    </>
  );
}
