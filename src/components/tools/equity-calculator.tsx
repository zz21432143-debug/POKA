"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2Icon, RotateCcwIcon, ShuffleIcon } from "lucide-react";
import { cardCode, cardIndex } from "@/lib/hand-eval";
import { classCombos, exactEquity, madeHand, randomEquity, rangeEquity, requiredEquity, type EquityResult } from "@/lib/equity";
import { HAND_NAMES, handCombos, topRange } from "@/lib/hand-ranking";
import { cn } from "cn";

type Slot = "h1" | "h2" | "v1" | "v2" | "f1" | "f2" | "f3" | "t" | "r";
const SLOTS: Slot[] = ["h1", "h2", "v1", "v2", "f1", "f2", "f3", "t", "r"];
const STREETS = [
  { key: "preflop", label: "프리플랍", board: 0 },
  { key: "flop", label: "플랍", board: 3 },
  { key: "turn", label: "턴", board: 4 },
  { key: "river", label: "리버", board: 5 },
] as const;
type StreetKey = (typeof STREETS)[number]["key"];

const RANK_ROW = "AKQJT98765432";
const SUIT_ROW = [
  { code: "s", glyph: "♠", red: false },
  { code: "h", glyph: "♥", red: true },
  { code: "d", glyph: "♦", red: true },
  { code: "c", glyph: "♣", red: false },
];
const pct = (x: number) => `${(x * 100).toFixed(1)}%`;

function CardFace({ code, empty, active, onClick, label }: { code: string | null; empty?: string; active?: boolean; onClick?: () => void; label: string }) {
  const suit = code ? SUIT_ROW.find((s) => s.code === code[1]) : null;
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn(
        "flex h-16 w-12 shrink-0 flex-col items-center justify-center rounded-lg border-2 font-black leading-none sm:h-20 sm:w-14",
        code ? "border-zinc-300 bg-white" : "border-dashed border-white/25 bg-black/30 text-xs text-[#9CA3AF]",
        active && "ring-2 ring-[#c9a25c] ring-offset-2 ring-offset-[#120d0b]",
        suit?.red ? "text-red-600" : "text-zinc-900",
      )}
    >
      {code ? (
        <>
          <span className="text-lg sm:text-xl">{code[0] === "T" ? "10" : code[0]}</span>
          <span className="text-lg sm:text-xl">{suit?.glyph}</span>
        </>
      ) : (
        <span>{empty}</span>
      )}
    </button>
  );
}

/** 승률 계산기: 내 패 · 상대 패 · 보드를 고르면 프리플랍~리버 승률을 정확히 계산 */
export function EquityCalculator() {
  const [cards, setCards] = useState<Record<Slot, string | null>>({ h1: "Ah", h2: "Kh", v1: "Qs", v2: "Qd", f1: null, f2: null, f3: null, t: null, r: null });
  // 상대: 패 지정 · 상위 범위 · 모름(아무 패)
  const [villainMode, setVillainMode] = useState<"cards" | "range" | "random">("cards");
  const [rangePct, setRangePct] = useState(15);
  const randomVillain = villainMode !== "cards";
  const [active, setActive] = useState<Slot>("f1");
  const [results, setResults] = useState<Partial<Record<StreetKey, EquityResult>>>({});
  const [busy, setBusy] = useState<StreetKey | null>(null);
  const [guessMode, setGuessMode] = useState(false);
  const [guesses, setGuesses] = useState<Partial<Record<StreetKey, string>>>({});
  const [revealed, setRevealed] = useState(false);
  const [pot, setPot] = useState("");
  const [bet, setBet] = useState("");
  const run = useRef(0);

  // 상대 패를 안 쓰는 방식이면 상대 칸 카드는 빼고 셈
  const used = new Set(
    (Object.entries(cards) as [Slot, string | null][]).filter(([slot, c]) => c && !(randomVillain && (slot === "v1" || slot === "v2"))).map(([, c]) => c as string),
  );
  const hero = [cards.h1, cards.h2];
  const villain = [cards.v1, cards.v2];
  const flop = [cards.f1, cards.f2, cards.f3];
  const heroReady = hero.every(Boolean);
  const villainReady = randomVillain || villain.every(Boolean);
  const flopReady = flop.every(Boolean);
  const boardFor = (n: number) => [cards.f1, cards.f2, cards.f3, cards.t, cards.r].slice(0, n);
  const streetReady = (n: number) => heroReady && villainReady && boardFor(n).every(Boolean) && (n === 0 || flopReady);
  const key = JSON.stringify([cards, villainMode, villainMode === "range" ? rangePct : 0]);
  const rangeSet = villainMode === "range" ? topRange(rangePct) : null;
  const rangeCombos = rangeSet ? [...rangeSet].flatMap((k) => classCombos(HAND_NAMES[k])) : [];
  const rangeComboCount = rangeSet ? [...rangeSet].reduce((sum, k) => sum + handCombos(HAND_NAMES[k]), 0) : 0;

  useEffect(() => {
    const id = ++run.current;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 카드가 바뀌면 이전 결과를 지우고 다시 계산
    setResults({});
    setRevealed(false);
    (async () => {
      for (const street of STREETS) {
        if (!streetReady(street.board)) continue;
        if (id !== run.current) return;
        setBusy(street.key);
        const h = hero.map((c) => cardIndex(c!));
        const b = boardFor(street.board).map((c) => cardIndex(c!));
        const r =
          villainMode === "range"
            ? await rangeEquity(h, b, rangeCombos, street.board === 0 ? 150_000 : 100_000)
            : villainMode === "random"
              ? await randomEquity(h, b, street.board === 0 ? 150_000 : 100_000)
              : await exactEquity(h, villain.map((c) => cardIndex(c!)), b);
        if (id !== run.current) return;
        if (!r) continue;
        setResults((prev) => ({ ...prev, [street.key]: r }));
      }
      if (id === run.current) setBusy(null);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  function pick(code: string) {
    if (used.has(code)) return;
    setCards((prev) => ({ ...prev, [active]: code }));
    // 다음 빈 칸으로
    const order = SLOTS.filter((s) => !(randomVillain && (s === "v1" || s === "v2")));
    const next = order.slice(order.indexOf(active) + 1).find((s) => !cards[s] && s !== active);
    if (next) setActive(next);
  }
  function clearSlot(slot: Slot) {
    setCards((prev) => ({ ...prev, [slot]: null }));
    setActive(slot);
  }
  function resetBoard() {
    setCards((prev) => ({ ...prev, f1: null, f2: null, f3: null, t: null, r: null }));
    setActive("f1");
  }
  function randomBoard() {
    const free: string[] = [];
    for (let c = 0; c < 52; c++) {
      const code = cardCode(c);
      if (![cards.h1, cards.h2, ...(randomVillain ? [] : [cards.v1, cards.v2])].includes(code)) free.push(code);
    }
    for (let i = free.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [free[i], free[j]] = [free[j], free[i]];
    }
    setCards((prev) => ({ ...prev, f1: free[0], f2: free[1], f3: free[2], t: free[3], r: free[4] }));
  }

  const slotCard = (slot: Slot, label: string, empty: string) => (
    <CardFace code={cards[slot]} empty={empty} active={active === slot} label={`${label} ${cards[slot] ?? "비어 있음"}`} onClick={() => (cards[slot] && active === slot ? clearSlot(slot) : setActive(slot))} />
  );
  const lastStreet = [...STREETS].reverse().find((s) => results[s.key]);
  const need = requiredEquity(Number(pot.replace(/[^0-9.]/g, "")), Number(bet.replace(/[^0-9.]/g, "")));
  const current = lastStreet ? results[lastStreet.key]! : null;
  const currentEq = current ? current.win + current.tie / 2 : null;

  return (
    <div data-equity className="grid grid-cols-[minmax(0,1fr)] gap-4">
      <section aria-label="카드 고르기" className="ink-panel grid gap-3 rounded-2xl p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <span className="text-sm font-black text-[#f3d9a4]">내 패</span>
            <div className="flex gap-2">
              {slotCard("h1", "내 패 1", "내 패")}
              {slotCard("h2", "내 패 2", "내 패")}
            </div>
          </div>
          <div className="grid gap-1.5">
            <span className="flex flex-wrap items-center justify-between gap-1 text-sm font-black text-[#f3d9a4]">
              상대
              <span role="tablist" aria-label="상대 패" className="flex gap-1 rounded-lg border border-white/10 bg-black/30 p-0.5">
                {(
                  [
                    ["cards", "패 지정"],
                    ["range", "상위 범위"],
                    ["random", "모름"],
                  ] as const
                ).map(([k, l]) => (
                  <button
                    key={k}
                    type="button"
                    role="tab"
                    aria-selected={villainMode === k}
                    data-eq-villain={k}
                    onClick={() => setVillainMode(k)}
                    className={cn("inline-flex min-h-9 items-center rounded-md px-2.5 text-xs font-bold", villainMode === k ? "bg-[#c9a25c] text-[#1d1611]" : "text-[#d1c7b5]")}
                  >
                    {l}
                  </button>
                ))}
              </span>
            </span>
            {villainMode === "random" ? (
              <p className="flex h-16 items-center text-sm text-[#d1c7b5] sm:h-20">상대 패를 무작위로 수십만 번 뽑아 계산해요.</p>
            ) : villainMode === "range" ? (
              <div className="grid gap-1">
                <span className="flex items-baseline justify-between text-xs font-bold text-[#d1c7b5]">
                  강한 패부터 상위
                  <b data-eq-range className="text-lg text-white">
                    {rangePct}%{" "}
                    <span className="text-xs text-[#9CA3AF]">
                      ({rangeSet?.size}가지 · {rangeComboCount}조합)
                    </span>
                  </b>
                </span>
                <input aria-label="상대 범위 %" type="range" min={1} max={100} value={rangePct} onChange={(e) => setRangePct(Number(e.target.value))} className="h-9 w-full accent-[#c9a25c]" />
                <p className="text-[11px] leading-4 text-[#9CA3AF]">
                  예: {[...(rangeSet ?? [])].slice(0, 8).map((k) => HAND_NAMES[k]).join(" ")}
                  {(rangeSet?.size ?? 0) > 8 ? " …" : ""} (핸드 레인지 순위 기준)
                </p>
              </div>
            ) : (
              <div className="flex gap-2">
                {slotCard("v1", "상대 패 1", "상대")}
                {slotCard("v2", "상대 패 2", "상대")}
              </div>
            )}
          </div>
        </div>
        <div className="grid gap-1.5">
          <span className="flex flex-wrap items-center justify-between gap-2 text-sm font-black text-[#f3d9a4]">
            보드 (플랍 · 턴 · 리버)
            <span className="flex gap-1">
              <button type="button" onClick={randomBoard} className="inline-flex min-h-9 items-center gap-1 rounded-full border border-white/15 px-3 text-xs font-bold text-[#d1c7b5] hover:border-[#c9a25c]">
                <ShuffleIcon className="size-3.5" />
                무작위 보드
              </button>
              <button type="button" onClick={resetBoard} className="inline-flex min-h-9 items-center gap-1 rounded-full border border-white/15 px-3 text-xs font-bold text-[#d1c7b5] hover:border-[#c9a25c]">
                <RotateCcwIcon className="size-3.5" />
                보드 비우기
              </button>
            </span>
          </span>
          <div className="flex flex-wrap items-center gap-2">
            {slotCard("f1", "플랍 1", "플랍")}
            {slotCard("f2", "플랍 2", "플랍")}
            {slotCard("f3", "플랍 3", "플랍")}
            <span className="w-1" />
            {slotCard("t", "턴", "턴")}
            <span className="w-1" />
            {slotCard("r", "리버", "리버")}
          </div>
          <p className="text-xs text-[#9CA3AF]">칸을 누르고 아래에서 카드를 고르세요. 고른 칸을 한 번 더 누르면 비워져요.</p>
        </div>
        <div role="grid" aria-label="카드 고르기" className="grid gap-1">
          {SUIT_ROW.map((suit) => (
            <div key={suit.code} className="grid gap-1" style={{ gridTemplateColumns: "repeat(13, minmax(0, 1fr))" }}>
              {RANK_ROW.split("").map((rank) => {
                const code = `${rank}${suit.code}`;
                const taken = used.has(code);
                return (
                  <button
                    key={code}
                    type="button"
                    data-card={code}
                    disabled={taken}
                    onClick={() => pick(code)}
                    aria-label={`${rank === "T" ? "10" : rank}${suit.glyph}`}
                    className={cn(
                      "flex h-11 min-w-0 flex-col items-center justify-center rounded-md border text-[11px] leading-none font-black sm:text-sm",
                      taken ? "border-transparent bg-white/5 text-white/15" : "border-zinc-300 bg-white hover:ring-2 hover:ring-[#c9a25c]",
                      !taken && (suit.red ? "text-red-600" : "text-zinc-900"),
                    )}
                  >
                    <span>{rank === "T" ? "10" : rank}</span>
                    <span>{suit.glyph}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </section>

      <section aria-label="승률" className="rounded-2xl border-2 border-[#c9a25c]/60 bg-[#1d1611] p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-black text-[#f3d9a4]">스트리트별 승률</h2>
          <label className="inline-flex min-h-10 items-center gap-2 text-sm font-bold text-[#d1c7b5]">
            <input type="checkbox" checked={guessMode} onChange={(e) => { setGuessMode(e.target.checked); setRevealed(false); }} className="size-4" data-eq-guess />
            맞춰 보기(먼저 내 예상 적기)
          </label>
        </div>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[30rem] text-sm">
            <thead>
              <tr className="border-b border-white/15 text-left text-xs text-[#9CA3AF]">
                <th className="py-2 font-semibold">스트리트</th>
                {guessMode ? <th className="py-2 text-right font-semibold">내 예상</th> : null}
                <th className="py-2 text-right font-semibold text-[#f3d9a4]">내 승률</th>
                <th className="py-2 text-right font-semibold">무승부</th>
                <th className="py-2 text-right font-semibold">상대 승률</th>
                <th className="py-2 text-right font-semibold">내 족보</th>
              </tr>
            </thead>
            <tbody>
              {STREETS.map((street) => {
                const r = results[street.key];
                const ready = streetReady(street.board);
                const hidden = guessMode && !revealed;
                const guess = Number((guesses[street.key] ?? "").replace(/[^0-9.]/g, ""));
                const actual = r ? (r.win + r.tie / 2) * 100 : null;
                const made = street.board >= 3 && ready ? madeHand(hero.map((c) => cardIndex(c!)), boardFor(street.board).map((c) => cardIndex(c!))) : null;
                return (
                  <tr key={street.key} data-street={street.key} className="border-b border-white/5">
                    <td className="py-2.5 font-bold text-white">{street.label}</td>
                    {guessMode ? (
                      <td className="py-1.5 text-right">
                        <input
                          aria-label={`${street.label} 내 예상 승률`}
                          inputMode="decimal"
                          value={guesses[street.key] ?? ""}
                          onChange={(e) => setGuesses((prev) => ({ ...prev, [street.key]: e.target.value }))}
                          disabled={!ready || revealed}
                          placeholder="%"
                          className="h-10 w-20 rounded-lg border border-white/15 bg-black/40 px-2 text-right text-white"
                        />
                        {revealed && guesses[street.key] && actual != null ? (
                          <div className={cn("mt-0.5 text-[11px] font-bold", Math.abs(guess - actual) <= 5 ? "text-emerald-300" : "text-rose-300")}>
                            {Math.abs(guess - actual) <= 5 ? "정답 범위(±5%)" : `${guess > actual ? "+" : ""}${(guess - actual).toFixed(1)}%`}
                          </div>
                        ) : null}
                      </td>
                    ) : null}
                    <td data-eq-win className="py-2.5 text-right text-base font-black text-[#f3d9a4] tabular-nums">
                      {!ready ? "—" : !r ? <Loader2Icon className="ml-auto size-4 animate-spin" /> : hidden ? "?" : pct(r.win)}
                    </td>
                    <td className="py-2.5 text-right tabular-nums text-[#d1c7b5]">{r && !hidden ? pct(r.tie) : "—"}</td>
                    <td className="py-2.5 text-right tabular-nums text-[#ece4d6]">{r && !hidden ? pct(r.lose) : "—"}</td>
                    <td className="py-2.5 text-right text-[#d1c7b5]">{made ?? "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {guessMode ? (
          <button type="button" data-eq-reveal onClick={() => setRevealed(true)} disabled={revealed || busy !== null} className="mt-3 inline-flex min-h-11 items-center rounded-xl bg-[#c9a25c] px-4 text-sm font-black text-[#1d1611] disabled:opacity-50">
            정답 보기
          </button>
        ) : null}
        <p className="mt-2 text-xs leading-5 text-[#9CA3AF]">
          {villainMode === "range"
            ? `상대 범위(상위 ${rangePct}%): 범위 안 조합과 보드를 무작위로 10만~15만 번 뽑아 계산(오차 약 ±0.3%).`
            : randomVillain
              ? "상대 패 모름: 무작위로 10만~15만 번 뽑아 계산(오차 약 ±0.3%)."
              : "상대 패를 정하면 남은 보드를 전부 따져 정확히 계산해요(프리플랍 171만 가지)."}
          {busy ? ` 계산 중: ${STREETS.find((s) => s.key === busy)?.label}…` : ""}
        </p>
      </section>

      <section aria-label="콜 판단" className="ink-panel grid gap-2 rounded-2xl p-4">
        <h2 className="text-lg font-black text-white">콜해도 될까? (팟 오즈)</h2>
        <p className="text-sm text-[#d1c7b5]">베팅 전 팟과 상대 베팅을 적으면 콜에 필요한 승률을 지금 스트리트 승률과 비교해요.</p>
        <div className="grid grid-cols-2 gap-2 sm:max-w-md">
          <label className="grid gap-1 text-xs font-bold text-[#9CA3AF]">
            베팅 전 팟
            <input aria-label="베팅 전 팟" inputMode="decimal" value={pot} onChange={(e) => setPot(e.target.value)} placeholder="예: 100" className="h-11 rounded-xl border border-white/15 bg-black/40 px-3 text-right text-white" />
          </label>
          <label className="grid gap-1 text-xs font-bold text-[#9CA3AF]">
            상대 베팅
            <input aria-label="상대 베팅" inputMode="decimal" value={bet} onChange={(e) => setBet(e.target.value)} placeholder="예: 50" className="h-11 rounded-xl border border-white/15 bg-black/40 px-3 text-right text-white" />
          </label>
        </div>
        {need != null ? (
          <p data-eq-call className="text-[15px] text-[#ece4d6]">
            필요한 승률 <b className="text-white">{pct(need)}</b>
            {currentEq != null && lastStreet ? (
              <>
                {" "}
                · 지금({lastStreet.label}) 내 승률 <b className="text-white">{pct(currentEq)}</b> →{" "}
                <b className={currentEq >= need ? "text-emerald-300" : "text-rose-300"}>{currentEq >= need ? "콜이 이득" : "폴드가 이득"}</b>
              </>
            ) : null}
          </p>
        ) : null}
        <p className="text-xs text-[#9CA3AF]">승률은 무승부를 반으로 쳐서(내 승률 + 무승부 ÷ 2) 비교해요. 남은 베팅(임플라이드 오즈)은 넣지 않은 기본 계산이에요.</p>
      </section>
    </div>
  );
}
