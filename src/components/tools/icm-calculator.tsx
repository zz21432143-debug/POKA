"use client";

import { useEffect, useState } from "react";
import { CopyIcon, MinusIcon, PlusIcon, RotateCcwIcon } from "lucide-react";
import { ICM_MAX_PLAYERS, chipChop, icmEquity, parseAmount } from "@/lib/icm";
import { cn } from "cn";

type Player = { name: string; stack: string };

const STORE_KEY = "poka-icm-v1";
const SAMPLE: { players: Player[]; payouts: string[] } = {
  players: [
    { name: "", stack: "520,000" },
    { name: "", stack: "310,000" },
    { name: "", stack: "180,000" },
    { name: "", stack: "90,000" },
  ],
  payouts: ["300만", "180만", "120만", "80만"],
};

const won = (n: number) => Math.round(n).toLocaleString("ko-KR");
const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
/** 칩 입력: 숫자만 남기고 천 단위 쉼표 */
const chipText = (raw: string) => {
  const digits = raw.replace(/[^0-9]/g, "").slice(0, 13);
  return digits ? Number(digits).toLocaleString("ko-KR") : "";
};

function load() {
  try {
    const saved = JSON.parse(window.localStorage.getItem(STORE_KEY) ?? "null") as typeof SAMPLE | null;
    if (saved && Array.isArray(saved.players) && Array.isArray(saved.payouts) && saved.players.length >= 2) return saved;
  } catch {
    /* 저장소를 못 쓰면 예시로 */
  }
  return null;
}

/** ICM 계산기: 남은 사람 칩 + 순위별 상금 → 사람마다 상금 가치(ICM 딜 금액) */
export function IcmCalculator() {
  const [players, setPlayers] = useState<Player[]>(SAMPLE.players);
  const [payouts, setPayouts] = useState<string[]>(SAMPLE.payouts);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const saved = load();
    if (saved) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- 저장해 둔 입력은 브라우저에서만 읽을 수 있음
      setPlayers(saved.players);
      setPayouts(saved.payouts);
    }
  }, []);
  useEffect(() => {
    try {
      window.localStorage.setItem(STORE_KEY, JSON.stringify({ players, payouts }));
    } catch {
      /* 무시 */
    }
  }, [players, payouts]);

  const stacks = players.map((p) => Number(p.stack.replace(/[^0-9]/g, "")) || 0);
  // 지금 남은 사람 수만큼의 순위만 씁니다
  const shownPayouts = Array.from({ length: players.length }, (_, i) => payouts[i] ?? "");
  const prizes = shownPayouts.map((p) => parseAmount(p));
  const badPrize = prizes.findIndex((p) => Number.isNaN(p));
  const ready = stacks.filter((s) => s > 0).length >= 2 && badPrize < 0 && prizes.some((p) => p > 0);

  // 칩을 적은 사람만 계산하고, 상금도 그 인원만큼의 순위만 씁니다(15명까지라 매번 다시 계산해도 빠름)
  const result = (() => {
    if (!ready) return null;
    const active = players.map((p, i) => ({ p, i })).filter(({ i }) => stacks[i] > 0);
    const activeStacks = active.map(({ i }) => stacks[i]);
    const clean = prizes.slice(0, active.length).map((p) => (Number.isNaN(p) ? 0 : p));
    const { equity, finish } = icmEquity(activeStacks, clean);
    const chop = chipChop(activeStacks, clean);
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
    return { rows: rows.sort((x, y) => y.stack - x.stack), pool: clean.reduce((x, y) => x + y, 0), totalChips };
  })();

  function setPlayer(i: number, patch: Partial<Player>) {
    setPlayers((prev) => prev.map((p, j) => (j === i ? { ...p, ...patch } : p)));
  }
  function addPlayer() {
    if (players.length >= ICM_MAX_PLAYERS) return;
    setPlayers((prev) => [...prev, { name: "", stack: "" }]);
  }
  function removePlayer(i: number) {
    if (players.length <= 2) return;
    setPlayers((prev) => prev.filter((_, j) => j !== i));
  }
  function setPayout(i: number, value: string) {
    setPayouts((prev) => Array.from({ length: Math.max(prev.length, i + 1) }, (_, j) => (j === i ? value : (prev[j] ?? ""))));
  }
  function reset() {
    setPlayers(SAMPLE.players);
    setPayouts(SAMPLE.payouts);
  }
  async function copy() {
    if (!result) return;
    const lines = [
      "[ICM 딜 계산] POKA ICM 계산기",
      ...result.rows.map((r) => `${r.name} · 칩 ${won(r.stack)} → ${won(r.equity)}`),
      `상금 합 ${won(result.pool)}`,
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

  return (
    <div data-icm className="grid grid-cols-[minmax(0,1fr)] gap-4">
      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-2">
        <section aria-label="남은 플레이어" className="ink-panel grid content-start gap-2 rounded-2xl p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-black text-white">① 남은 플레이어 칩</h2>
            <button type="button" onClick={reset} className="inline-flex min-h-10 items-center gap-1 px-2 text-xs font-bold text-[#9CA3AF] hover:text-white">
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

        <section aria-label="순위별 상금" className="ink-panel grid content-start gap-2 rounded-2xl p-4">
          <h2 className="text-lg font-black text-white">② 남은 순위별 상금</h2>
          <p className="text-xs text-[#9CA3AF]">지금 남은 사람 수만큼 1위부터 적어 주세요. 「300만」 「1.5억」처럼 써도 돼요. 상금이 없는 순위는 비워 두세요.</p>
          <ul className="grid grid-cols-2 gap-2">
            {shownPayouts.map((value, i) => (
              <li key={i} className="grid grid-cols-[2.5rem_minmax(0,1fr)] items-center gap-1.5">
                <span className="text-sm font-black text-[#e7c98a]">{i + 1}위</span>
                <input
                  aria-label={`${i + 1}위 상금`}
                  value={value}
                  onChange={(e) => setPayout(i, e.target.value)}
                  placeholder="0"
                  className={cn(input, "text-right tabular-nums", Number.isNaN(prizes[i]) && "border-rose-500")}
                />
              </li>
            ))}
          </ul>
          {badPrize >= 0 ? <p className="text-sm font-bold text-rose-300">{badPrize + 1}위 상금을 숫자로 적어 주세요(예: 300만, 1500000).</p> : null}
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
              상금 합 {won(result.pool)} · 칩 합 {won(result.totalChips)}. 「차이」는 ICM 딜과 칩 비율로 나눴을 때의 차이예요. 숏스택은 ICM이 더 유리하고, 칩 리더는 칩 비율 딜이 더 유리합니다.
            </p>
          </>
        ) : (
          <p className="mt-3 text-sm text-[#d1c7b5]">칩을 2명 이상, 상금을 1개 이상 입력하면 바로 계산돼요.</p>
        )}
      </section>
    </div>
  );
}
