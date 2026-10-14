"use client";

import { useEffect, useState } from "react";
import { CopyIcon, MinusIcon, PlusIcon, RotateCcwIcon } from "lucide-react";
import { ICM_MAX_PLAYERS, chipChop, icmEquity, parseAmount } from "@/lib/icm";
import { shareResultImage } from "@/lib/share-image";
import { ShareButton } from "@/components/tools/share-button";
import { cn } from "cn";

type Player = { name: string; stack: string };
type Mode = "amount" | "percent";
type Saved = { players: Player[]; mode: Mode; total: string; places: number; amounts: string[]; percents: string[] };

const STORE_KEY = "poka-icm-v2";
/** 상금 받는 순위 최대 */
const MAX_PLACES = 50;
const SAMPLE: Saved = {
  players: [
    { name: "", stack: "520,000" },
    { name: "", stack: "310,000" },
    { name: "", stack: "180,000" },
    { name: "", stack: "90,000" },
  ],
  mode: "percent",
  total: "1,000만",
  places: 6,
  amounts: [],
  percents: ["36", "22", "16", "11", "8.5", "6.5"],
};
/** 비율 예시(합 100%) */
const PERCENT_PRESETS: { label: string; values: string[] }[] = [
  { label: "3명 50·30·20", values: ["50", "30", "20"] },
  { label: "6명", values: ["36", "22", "16", "11", "8.5", "6.5"] },
  { label: "9명", values: ["30", "20", "14", "10", "8", "6", "5", "4", "3"] },
];

const won = (n: number) => Math.round(n).toLocaleString("ko-KR");
const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
/** 칩 입력: 숫자만 남기고 천 단위 쉼표 */
const chipText = (raw: string) => {
  const digits = raw.replace(/[^0-9]/g, "").slice(0, 13);
  return digits ? Number(digits).toLocaleString("ko-KR") : "";
};
/** "12.5", "12.5%" → 12.5 · 빈칸 0 · 잘못되면 NaN */
const parsePercent = (raw: string) => {
  const text = raw.replace(/[%\s]/g, "");
  if (!text) return 0;
  return /^\d+(\.\d+)?$/.test(text) ? Number(text) : Number.NaN;
};

function load(): Saved | null {
  try {
    const saved = JSON.parse(window.localStorage.getItem(STORE_KEY) ?? "null") as Saved | null;
    if (saved && Array.isArray(saved.players) && saved.players.length >= 2 && (saved.mode === "amount" || saved.mode === "percent")) return saved;
  } catch {
    /* 저장소를 못 쓰면 예시로 */
  }
  return null;
}

/**
 * ICM 계산기: 남은 사람 칩 + 상금표(금액 또는 총상금 × 비율) → 사람마다 상금 가치(ICM 딜 금액).
 * 상금표는 대회 전체 순위로 적고, 남은 인원보다 아래 순위(이미 탈락해 받은 상금)는 자동으로 빼고 계산합니다.
 */
export function IcmCalculator() {
  const [state, setState] = useState<Saved>(SAMPLE);
  const [copied, setCopied] = useState(false);
  const { players, mode, total, places, amounts, percents } = state;
  const patch = (next: Partial<Saved>) => setState((prev) => ({ ...prev, ...next }));

  useEffect(() => {
    const saved = load();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 저장해 둔 입력은 브라우저에서만 읽을 수 있음
    if (saved) setState(saved);
  }, []);
  useEffect(() => {
    try {
      window.localStorage.setItem(STORE_KEY, JSON.stringify(state));
    } catch {
      /* 무시 */
    }
  }, [state]);

  const stacks = players.map((p) => Number(p.stack.replace(/[^0-9]/g, "")) || 0);
  const activeCount = stacks.filter((s) => s > 0).length;
  const totalPrize = parseAmount(total);

  // 순위별 상금(전체 상금표)
  const rawValues = Array.from({ length: places }, (_, i) => (mode === "amount" ? (amounts[i] ?? "") : (percents[i] ?? "")));
  const parsed = rawValues.map((v) => (mode === "amount" ? parseAmount(v) : parsePercent(v)));
  const badPlace = parsed.findIndex((v) => Number.isNaN(v));
  const prizeTable = parsed.map((v) => (Number.isNaN(v) ? 0 : mode === "amount" ? v : (Number.isFinite(totalPrize) ? totalPrize : 0) * (v / 100)));
  const percentSum = mode === "percent" ? parsed.reduce((a, b) => a + (Number.isNaN(b) ? 0 : b), 0) : 0;
  const tableSum = prizeTable.reduce((a, b) => a + b, 0);
  // 남은 인원만큼 위 순위 = 아직 걸린 상금, 그 아래 = 이미 탈락한 사람에게 나간 상금
  const remainingPrizes = Array.from({ length: activeCount }, (_, i) => prizeTable[i] ?? 0);
  const remainingSum = remainingPrizes.reduce((a, b) => a + b, 0);
  const paidOut = tableSum - remainingSum;
  const totalBad = mode === "percent" && (!Number.isFinite(totalPrize) || totalPrize <= 0);
  const ready = activeCount >= 2 && badPlace < 0 && !totalBad && remainingSum > 0;

  // 칩을 적은 사람만 계산(15명까지라 매번 다시 계산해도 빠름)
  const result = (() => {
    if (!ready) return null;
    const active = players.map((p, i) => ({ p, i })).filter(({ i }) => stacks[i] > 0);
    const activeStacks = active.map(({ i }) => stacks[i]);
    const { equity, finish } = icmEquity(activeStacks, remainingPrizes);
    const chop = chipChop(activeStacks, remainingPrizes);
    const totalChips = activeStacks.reduce((a, b) => a + b, 0);
    const rows = active.map(({ p, i }, k) => ({
      i,
      name: p.name.trim() || `플레이어 ${i + 1}`,
      stack: stacks[i],
      share: totalChips ? stacks[i] / totalChips : 0,
      equity: equity[k],
      chop: chop[k],
      win: finish[k][0] ?? 0,
    }));
    return { rows: rows.sort((x, y) => y.stack - x.stack), pool: remainingSum, totalChips };
  })();

  function setPlayer(i: number, next: Partial<Player>) {
    patch({ players: players.map((p, j) => (j === i ? { ...p, ...next } : p)) });
  }
  function addPlayer() {
    if (players.length >= ICM_MAX_PLAYERS) return;
    patch({ players: [...players, { name: "", stack: "" }], places: Math.max(places, players.length + 1) });
  }
  function removePlayer(i: number) {
    if (players.length <= 2) return;
    patch({ players: players.filter((_, j) => j !== i) });
  }
  function setPlace(i: number, value: string) {
    const list = mode === "amount" ? amounts : percents;
    const next = Array.from({ length: Math.max(list.length, i + 1) }, (_, j) => (j === i ? value : (list[j] ?? "")));
    patch(mode === "amount" ? { amounts: next } : { percents: next });
  }
  function setPlaces(n: number) {
    patch({ places: Math.max(1, Math.min(MAX_PLACES, n)) });
  }
  async function copy() {
    if (!result) return;
    const lines = [
      "[ICM 딜 계산] POKA ICM 계산기",
      ...result.rows.map((r) => `${r.name} · 칩 ${won(r.stack)} → ${won(r.equity)}`),
      `남은 상금 ${won(result.pool)}${paidOut > 0 ? ` (이미 지급 ${won(paidOut)})` : ""}`,
      "pokerwiki.co.kr/info/icm",
    ];
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* 복사 실패는 조용히 */
    }
  }

  const input = "h-11 w-full min-w-0 rounded-xl border border-white/15 bg-black/40 px-3 text-[15px] text-white placeholder:text-[#7c7468] focus:border-[#c9a25c] focus:outline-none";
  const tab = (on: boolean) => cn("inline-flex min-h-10 flex-1 items-center justify-center rounded-lg px-3 text-sm font-bold", on ? "bg-[#c9a25c] text-[#1d1611]" : "text-[#d1c7b5] hover:bg-white/10");

  return (
    <div data-icm className="grid grid-cols-[minmax(0,1fr)] gap-4">
      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-2">
        <section aria-label="남은 플레이어" className="ink-panel grid content-start gap-2 rounded-2xl p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-black text-white">① 남은 플레이어 칩</h2>
            <button type="button" onClick={() => setState(SAMPLE)} className="inline-flex min-h-10 items-center gap-1 px-2 text-xs font-bold text-[#9CA3AF] hover:text-white">
              <RotateCcwIcon className="size-3.5" />
              예시로
            </button>
          </div>
          <ul className="grid gap-2">
            {players.map((p, i) => (
              <li key={i} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_2.75rem] items-center gap-2">
                <input aria-label={`${i + 1}번 이름`} value={p.name} maxLength={12} onChange={(e) => setPlayer(i, { name: e.target.value })} placeholder={`플레이어 ${i + 1}`} className={input} />
                <input
                  aria-label={`${i + 1}번 칩`}
                  inputMode="numeric"
                  value={p.stack}
                  onChange={(e) => setPlayer(i, { stack: chipText(e.target.value) })}
                  placeholder="칩"
                  className={cn(input, "text-right font-bold tabular-nums")}
                />
                <button type="button" aria-label={`${i + 1}번 빼기`} disabled={players.length <= 2} onClick={() => removePlayer(i)} className="inline-flex size-11 items-center justify-center rounded-xl border border-white/15 text-[#d1c7b5] hover:bg-white/10 disabled:opacity-30">
                  <MinusIcon className="size-4" />
                </button>
              </li>
            ))}
          </ul>
          <button type="button" data-icm-add onClick={addPlayer} disabled={players.length >= ICM_MAX_PLAYERS} className="inline-flex min-h-11 items-center justify-center gap-1 rounded-xl border border-dashed border-[#c9a25c]/60 text-sm font-bold text-[#e7c98a] hover:bg-[#c9a25c]/10 disabled:opacity-40">
            <PlusIcon className="size-4" />
            플레이어 추가 ({players.length}/{ICM_MAX_PLAYERS})
          </button>
        </section>

        <section aria-label="상금표" className="ink-panel grid content-start gap-2.5 rounded-2xl p-4">
          <h2 className="text-lg font-black text-white">② 상금표 (대회 전체)</h2>
          <div role="tablist" aria-label="상금 적는 방법" className="flex gap-1 rounded-xl border border-white/10 bg-black/30 p-1">
            <button type="button" role="tab" aria-selected={mode === "percent"} data-icm-mode="percent" onClick={() => patch({ mode: "percent" })} className={tab(mode === "percent")}>
              총상금 × 비율(%)
            </button>
            <button type="button" role="tab" aria-selected={mode === "amount"} data-icm-mode="amount" onClick={() => patch({ mode: "amount" })} className={tab(mode === "amount")}>
              순위별 금액
            </button>
          </div>
          <label className="grid grid-cols-[5.5rem_minmax(0,1fr)] items-center gap-2">
            <span className="text-sm font-bold text-[#e7c98a]">총상금</span>
            <input
              aria-label="총상금"
              value={total}
              onChange={(e) => patch({ total: e.target.value })}
              placeholder={mode === "percent" ? "예: 1,000만 (꼭 적기)" : "예: 1,000만 (선택)"}
              className={cn(input, "text-right font-bold tabular-nums", totalBad && "border-rose-500")}
            />
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-bold text-[#e7c98a]">상금 받는 순위</span>
            <div className="inline-flex items-center gap-1">
              <button type="button" aria-label="순위 줄이기" onClick={() => setPlaces(places - 1)} className="inline-flex size-10 items-center justify-center rounded-lg border border-white/15 hover:bg-white/10">
                <MinusIcon className="size-4" />
              </button>
              <span data-icm-places className="min-w-[3.5rem] text-center text-base font-black text-white">{places}위까지</span>
              <button type="button" aria-label="순위 늘리기" onClick={() => setPlaces(places + 1)} className="inline-flex size-10 items-center justify-center rounded-lg border border-white/15 hover:bg-white/10">
                <PlusIcon className="size-4" />
              </button>
            </div>
            {mode === "percent" ? (
              <div className="flex flex-wrap gap-1">
                {PERCENT_PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => patch({ percents: preset.values, places: preset.values.length })}
                    className="inline-flex min-h-9 items-center rounded-full border border-white/15 px-2.5 text-xs font-bold text-[#d1c7b5] hover:border-[#c9a25c]"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <ul className="grid grid-cols-2 gap-2">
            {rawValues.map((value, i) => {
              const remaining = i < activeCount;
              return (
                <li key={i} className={cn("grid grid-cols-[2.6rem_minmax(0,1fr)] items-center gap-1.5", !remaining && "opacity-55")}>
                  <span className={cn("text-sm font-black", remaining ? "text-[#e7c98a]" : "text-[#9CA3AF]")}>{i + 1}위</span>
                  <div className="relative">
                    <input
                      aria-label={`${i + 1}위 ${mode === "amount" ? "상금" : "비율"}`}
                      inputMode="decimal"
                      value={value}
                      onChange={(e) => setPlace(i, e.target.value)}
                      placeholder="0"
                      className={cn(input, "text-right tabular-nums", mode === "percent" && "pr-7", Number.isNaN(parsed[i]) && "border-rose-500")}
                    />
                    {mode === "percent" ? <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-[#9CA3AF]">%</span> : null}
                  </div>
                  {mode === "percent" && prizeTable[i] > 0 ? <span className="col-start-2 -mt-1 text-right text-[11px] text-[#9CA3AF] tabular-nums">{won(prizeTable[i])}</span> : null}
                </li>
              );
            })}
          </ul>
          {badPlace >= 0 ? <p className="text-sm font-bold text-rose-300">{badPlace + 1}위 {mode === "amount" ? "상금(예: 300만)" : "비율(예: 12.5)"}을 숫자로 적어 주세요.</p> : null}
          {totalBad ? <p className="text-sm font-bold text-rose-300">총상금을 적어 주세요(예: 1,000만).</p> : null}
          {mode === "percent" && Math.abs(percentSum - 100) > 0.05 && percentSum > 0 ? (
            <p data-icm-percent-warn className="text-sm font-bold text-amber-300">비율 합이 {Math.round(percentSum * 100) / 100}%예요. 보통 100%가 되어야 해요.</p>
          ) : null}
          <dl data-icm-summary className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1 rounded-xl bg-black/30 p-3 text-sm">
            <dt className="text-[#9CA3AF]">남은 {activeCount}명 몫 (1~{activeCount}위)</dt>
            <dd className="text-right font-black text-[#f3d9a4] tabular-nums">{won(remainingSum)}</dd>
            <dt className="text-[#9CA3AF]">이미 탈락한 순위 몫 ({activeCount + 1}~{places}위)</dt>
            <dd className="text-right font-bold text-[#d1c7b5] tabular-nums">{paidOut > 0 ? won(paidOut) : "0"}</dd>
            <dt className="text-[#9CA3AF]">상금표 합{mode === "amount" && Number.isFinite(totalPrize) && totalPrize > 0 ? ` (총상금의 ${Math.round((tableSum / totalPrize) * 1000) / 10}%)` : ""}</dt>
            <dd className="text-right font-bold text-[#d1c7b5] tabular-nums">{won(tableSum)}</dd>
          </dl>
          <p className="text-xs leading-5 text-[#9CA3AF]">
            상금표는 대회 전체 순위로 적으세요. 남은 인원보다 아래 순위(이미 탈락한 사람이 받은 상금)는 자동으로 빼고, 남은 사람끼리 걸린 상금으로만 ICM을 계산해요.
          </p>
        </section>
      </div>

      <section aria-label="ICM 결과" className="rounded-2xl border-2 border-[#c9a25c]/60 bg-[#1d1611] p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-black text-[#f3d9a4]">③ ICM 딜 금액</h2>
          {result ? (
            <button type="button" data-icm-copy onClick={() => void copy()} className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-[#c9a25c]/60 px-3.5 text-sm font-bold text-[#f3d9a4] hover:bg-[#c9a25c]/10">
              <CopyIcon className="size-4" />
              {copied ? "복사했어요" : "결과 복사(단톡방용)"}
            </button>
          ) : null}
          {result ? (
            <ShareButton
              tool="icm"
              label="이미지로 공유"
              onShare={(format, byline) =>
                shareResultImage({
                  title: "ICM 딜 계산",
                  subtitle: `남은 상금 ${won(result.pool)} · ${result.rows.length}명`,
                  lines: result.rows.slice(0, 9).map((r, k) => ({ label: `${r.name} · 칩 ${won(r.stack)}`, value: won(r.equity), strong: k === 0 })),
                  url: "pokerwiki.co.kr/info/icm",
                  fileName: "POKA_ICM",
                  format,
                  byline,
                })
              }
            />
          ) : null}
        </div>
        {result ? (
          <>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[34rem] text-sm">
                <thead>
                  <tr className="border-b border-white/15 text-left text-xs text-[#9CA3AF]">
                    <th className="py-2 font-semibold">플레이어</th>
                    <th className="py-2 text-right font-semibold">칩 (비율)</th>
                    <th className="py-2 text-right font-semibold">우승 확률</th>
                    <th className="py-2 text-right font-semibold text-[#f3d9a4]">ICM 금액</th>
                    <th className="py-2 text-right font-semibold">칩 비율 딜</th>
                    <th className="py-2 text-right font-semibold">차이</th>
                  </tr>
                </thead>
                <tbody>
                  {result.rows.map((r) => {
                    const diff = r.equity - r.chop;
                    return (
                      <tr key={r.i} data-icm-row className="border-b border-white/5">
                        <td className="py-2.5 font-bold text-white">{r.name}</td>
                        <td className="py-2.5 text-right tabular-nums text-[#ece4d6]">
                          {won(r.stack)} <span className="text-xs text-[#9CA3AF]">({pct(r.share)})</span>
                        </td>
                        <td className="py-2.5 text-right tabular-nums text-[#ece4d6]">{pct(r.win)}</td>
                        <td data-icm-equity className="py-2.5 text-right text-base font-black tabular-nums text-[#f3d9a4]">{won(r.equity)}</td>
                        <td className="py-2.5 text-right tabular-nums text-[#d1c7b5]">{won(r.chop)}</td>
                        <td className={cn("py-2.5 text-right font-bold tabular-nums", diff >= 0 ? "text-emerald-300" : "text-rose-300")}>
                          {diff >= 0 ? "+" : ""}
                          {won(diff)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs leading-5 text-[#9CA3AF]">
              남은 상금 {won(result.pool)} · 칩 합 {won(result.totalChips)}. 「차이」는 ICM 딜과 칩 비율로 나눴을 때의 차이예요. 숏스택은 ICM이 더 유리하고, 칩 리더는 칩 비율 딜이 더 유리합니다.
            </p>
          </>
        ) : (
          <p className="mt-3 text-sm text-[#d1c7b5]">칩을 2명 이상 적고, 상금표(남은 순위)에 상금이 있으면 바로 계산돼요.</p>
        )}
      </section>
    </div>
  );
}
