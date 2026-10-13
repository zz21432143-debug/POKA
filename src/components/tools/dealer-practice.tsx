"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "cn";
import { computePots, explainPots, payouts, potName, type PotPlayer } from "@/lib/side-pot";
import { DEFAULT_BLINDS, PRACTICE_KINDS, ROUND_SIZE, potProblem, readNumber, validBlinds, type Blinds, type PotProblem, type Seat } from "@/lib/practice";

/** 지금 시각(ms) — 화면 그리기와 상관없는 기록용 */
const nowMs = () => Date.now();
const won = (n: number) => Math.round(n).toLocaleString("ko-KR");
const secText = (ms: number) => `${Math.floor(ms / 60000) ? `${Math.floor(ms / 60000)}분 ` : ""}${((ms % 60000) / 1000).toFixed(1)}초`;
const BLINDS_KEY = "poka-practice-blinds-v1";

type Row = { nickname: string; correct: number; durationMs: number; at: string; mine: boolean };
type Board = Record<string, { top: Row[]; best: Row | null }>;

/** 딜러 연습장: 팟 계산(연습) · 사이드팟 계산기(실전) · 기록·랭킹 */
export function DealerPractice() {
  const [tab, setTab] = useState<"drill" | "calc" | "board">("drill");
  const [board, setBoard] = useState<Board | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/tools/practice", { cache: "no-store" })
      .then((r) => r.json())
      .then((data: { board?: Board }) => {
        if (alive && data.board) setBoard(data.board);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="grid gap-3 text-white">
      <nav role="tablist" aria-label="딜러 연습장" className="grid grid-cols-3 gap-1 rounded-2xl border border-white/15 bg-zinc-950 p-1">
        {(
          [
            ["drill", "팟 계산"],
            ["calc", "사이드팟 계산기"],
            ["board", "기록 · 랭킹"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={cn("min-h-11 rounded-xl text-sm font-black", tab === key ? "bg-amber-400 text-black" : "text-zinc-300 hover:bg-white/10")}
          >
            {label}
          </button>
        ))}
      </nav>
      {tab === "drill" ? <PotDrill best={board?.sidepot?.best ?? null} onSaved={setBoard} /> : null}
      {tab === "calc" ? <SidePotCalculator /> : null}
      {tab === "board" ? <Ranking board={board} /> : null}
    </div>
  );
}

/* ───────────── 블라인드 설정 ───────────── */

function useBlinds() {
  const [blinds, setBlinds] = useState<Blinds>(DEFAULT_BLINDS);
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(BLINDS_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Blinds;
        // eslint-disable-next-line react-hooks/set-state-in-effect -- 저장된 값은 화면이 뜬 뒤에만 읽을 수 있습니다.
        if (validBlinds(saved)) setBlinds(saved);
      }
    } catch {
      /* 기본값 */
    }
  }, []);
  const save = (next: Blinds) => {
    setBlinds(next);
    try {
      if (validBlinds(next)) window.localStorage.setItem(BLINDS_KEY, JSON.stringify(next));
    } catch {
      /* 무시 */
    }
  };
  return [blinds, save] as const;
}

function BlindInputs({ blinds, onChange }: { blinds: Blinds; onChange: (b: Blinds) => void }) {
  const ok = validBlinds(blinds);
  return (
    <div className="grid gap-1">
      <div className="grid grid-cols-3 gap-2">
        {(
          [
            ["sb", "SB(스몰 블라인드)"],
            ["bb", "BB(빅 블라인드)"],
            ["ante", "BB 앤티(없으면 0)"],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="grid min-w-0 gap-1 text-xs font-bold text-zinc-300">
            {label}
            <input
              aria-label={label}
              inputMode="numeric"
              value={blinds[key] ? won(blinds[key]) : key === "ante" ? "0" : ""}
              onChange={(e) => onChange({ ...blinds, [key]: readNumber(e.target.value) })}
              className="h-11 w-full min-w-0 rounded-lg border border-white/20 bg-black px-2 text-base font-black tabular-nums"
            />
          </label>
        ))}
      </div>
      {!ok ? <p className="text-xs font-bold text-rose-300">SB는 BB보다 작거나 같아야 하고, 0보다 커야 합니다.</p> : null}
    </div>
  );
}

/* ───────────── 타원형 테이블 ───────────── */

const ACTION: Record<Seat["action"], { label: string; tone: string }> = {
  allin: { label: "올인", tone: "bg-rose-600 text-white" },
  bet: { label: "베팅", tone: "bg-emerald-500 text-black" },
  call: { label: "콜", tone: "bg-sky-500 text-black" },
  fold: { label: "폴드", tone: "bg-zinc-600 text-zinc-100" },
};

function PokerTable({ seats, blinds }: { seats: Seat[]; blinds: Blinds }) {
  const n = seats.length;
  return (
    <div data-table className="relative mx-auto aspect-[4/5] w-full max-w-3xl sm:aspect-[16/10]">
      {/* 테이블(펠트) */}
      <div className="absolute inset-[13%_9%] rounded-[50%] border-[10px] border-[#5b3a1f] bg-[radial-gradient(ellipse_at_center,#1f7a4a_0%,#0f4d2d_70%,#0b3a22_100%)] shadow-[inset_0_0_30px_rgba(0,0,0,.6),0_8px_24px_rgba(0,0,0,.6)]" />
      <div className="absolute inset-0 grid place-items-center text-center">
        <div className="grid gap-0.5 rounded-xl bg-black/40 px-3 py-1.5">
          <span className="text-[11px] font-bold text-emerald-200">프리플랍 올인</span>
          <span className="text-sm font-black text-white sm:text-base">
            SB {won(blinds.sb)} · BB {won(blinds.bb)}
          </span>
          {blinds.ante ? <span className="text-[11px] font-bold text-amber-200">BB 앤티 {won(blinds.ante)} (메인 팟에)</span> : null}
        </div>
      </div>
      {seats.map((seat, i) => {
        // 버튼(BTN)을 맨 아래에 두고 시계 방향으로
        const angle = ((90 + (i * 360) / n) * Math.PI) / 180;
        const x = 50 + 43 * Math.cos(angle);
        const y = 50 + 44 * Math.sin(angle);
        const bx = 50 + 27 * Math.cos(angle);
        const by = 50 + 27 * Math.sin(angle);
        const act = ACTION[seat.action];
        return (
          <div key={seat.position}>
            <div
              data-seat={seat.position}
              className={cn(
                "absolute grid w-[23%] max-w-[8.5rem] min-w-[4.6rem] -translate-x-1/2 -translate-y-1/2 justify-items-center gap-0.5 rounded-xl border px-1 py-1 text-center shadow-lg",
                seat.action === "fold" ? "border-white/10 bg-zinc-900/90 opacity-75" : "border-amber-300/60 bg-black/90",
              )}
              style={{ left: `${x}%`, top: `${y}%` }}
            >
              <span className="text-sm font-black text-amber-300 sm:text-base">{seat.position}</span>
              <span className={cn("rounded px-1.5 text-[11px] font-black", act.tone)}>{seat.note ?? act.label}</span>
              {seat.amount ? <span className="text-xs font-black tabular-nums text-white sm:text-sm">{won(seat.amount)}</span> : <span className="text-[11px] text-zinc-500">—</span>}
            </div>
            {seat.amount ? (
              <span
                className="absolute flex -translate-x-1/2 -translate-y-1/2 items-center gap-1 rounded-full bg-black/60 px-1.5 py-0.5 text-[10px] font-black tabular-nums text-amber-100 sm:text-xs"
                style={{ left: `${bx}%`, top: `${by}%` }}
              >
                <span className="inline-block size-2.5 rounded-full border border-white/70 bg-rose-600" />
                {won(seat.amount)}
              </span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

/* ───────────── 팟 계산 연습(10문제) ───────────── */

function PotDrill({ best, onSaved }: { best: Row | null; onSaved: (board: Board) => void }) {
  const [blinds, setBlinds] = useBlinds();
  const [phase, setPhase] = useState<"ready" | "play" | "done">("ready");
  const [index, setIndex] = useState(0);
  const [question, setQuestion] = useState<PotProblem | null>(null);
  const [inputs, setInputs] = useState<string[]>([]);
  const [checked, setChecked] = useState<boolean | null>(null);
  const [correct, setCorrect] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [saved, setSaved] = useState<string | null>(null);
  const startRef = useRef(0);
  const firstInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (phase !== "play") return;
    const t = window.setInterval(() => setElapsed(nowMs() - startRef.current), 100);
    return () => window.clearInterval(t);
  }, [phase]);
  useEffect(() => {
    if (phase === "play" && checked === null) firstInput.current?.focus();
  }, [phase, checked, index]);

  const answer = question?.answer;
  const fields = answer ? [...answer.pots.map((_, i) => potName(i)), ...(answer.refund ? ["돌려줄 금액"] : [])] : [];
  const answers = answer ? [...answer.pots.map((p) => p.amount), ...(answer.refund ? [answer.refund.amount] : [])] : [];

  function start() {
    if (!validBlinds(blinds)) return;
    setPhase("play");
    setIndex(0);
    setCorrect(0);
    setSaved(null);
    setQuestion(potProblem(blinds));
    setInputs([]);
    setChecked(null);
    startRef.current = nowMs();
    setElapsed(0);
  }

  function check() {
    const ok = answers.every((a, i) => readNumber(inputs[i] ?? "") === a);
    setChecked(ok);
    if (ok) setCorrect((c) => c + 1);
  }

  async function next() {
    if (index + 1 >= ROUND_SIZE) {
      const durationMs = nowMs() - startRef.current;
      setElapsed(durationMs);
      setPhase("done");
      try {
        const res = await fetch("/api/tools/practice", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ kind: "sidepot", correct, durationMs }),
        });
        const data = (await res.json()) as { board?: Board; error?: string };
        if (data.board) onSaved(data.board);
        setSaved(res.ok ? "기록을 저장했습니다." : (data.error ?? "기록을 저장하지 못했습니다."));
      } catch {
        setSaved("기록을 저장하지 못했습니다.");
      }
      return;
    }
    setIndex(index + 1);
    setQuestion(potProblem(validBlinds(blinds) ? blinds : DEFAULT_BLINDS));
    setInputs([]);
    setChecked(null);
  }

  if (phase === "ready") {
    return (
      <section className="grid gap-3 rounded-2xl border border-white/15 bg-zinc-950 p-4">
        <h2 className="text-lg font-black">{PRACTICE_KINDS.sidepot} 연습</h2>
        <p className="text-sm text-zinc-300">
          테이블에서 누가 어느 포지션에서 얼마 올인·베팅·콜했는지 보고 <b className="text-amber-300">메인 · 세컨 · 서드 · 포스 · 피프스 팟</b> 금액(그리고 돌려줄 금액)을 계산해 넣으세요.
          틀리면 풀이가 나옵니다. {ROUND_SIZE}문제, 맞힌 수가 많고 빠를수록 높은 기록입니다.
        </p>
        <BlindInputs blinds={blinds} onChange={setBlinds} />
        {best ? (
          <p className="text-sm font-bold text-amber-300">
            내 최고 기록: {best.correct}/{ROUND_SIZE} · {secText(best.durationMs)}
          </p>
        ) : null}
        <button
          type="button"
          onClick={start}
          disabled={!validBlinds(blinds)}
          className="min-h-12 justify-self-start rounded-xl bg-amber-400 px-8 text-lg font-black text-black disabled:opacity-40"
        >
          시작
        </button>
      </section>
    );
  }

  if (phase === "done") {
    return (
      <section data-drill-done className="grid gap-3 rounded-2xl border-2 border-emerald-500 bg-emerald-950/30 p-4">
        <h2 className="text-lg font-black">{PRACTICE_KINDS.sidepot} 끝!</h2>
        <p className="text-3xl font-black">
          {correct}/{ROUND_SIZE} <span className="text-lg text-zinc-300">· {secText(elapsed)}</span>
        </p>
        {saved ? <p className="text-sm text-zinc-300">{saved}</p> : null}
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={start} className="min-h-11 rounded-xl bg-amber-400 px-6 text-base font-black text-black">
            다시 하기
          </button>
          <button type="button" onClick={() => setPhase("ready")} className="min-h-11 rounded-xl border border-white/25 px-4 text-sm font-bold">
            블라인드 바꾸기
          </button>
        </div>
      </section>
    );
  }

  return (
    <section data-drill className="poka-watermark grid gap-3 rounded-2xl border border-white/15 bg-zinc-950 p-3 sm:p-4">
      <div className="flex flex-wrap items-center gap-2 text-sm font-bold">
        <span className="rounded-full bg-amber-400 px-3 py-1 font-black text-black">
          {index + 1} / {ROUND_SIZE}
        </span>
        <span className="text-emerald-300">맞힘 {correct}</span>
        <span className="ml-auto tabular-nums text-zinc-300">{secText(elapsed)}</span>
      </div>

      {question ? <PokerTable seats={question.seats} blinds={question.blinds} /> : null}
      {answer ? (
        <p className="text-center text-xs font-bold text-zinc-400">
          팟 {answer.pots.length}개({answer.pots.map((_, i) => potName(i)).join(" · ")}){answer.refund ? " + 돌려줄 금액 있음" : ""}
        </p>
      ) : null}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (checked === null) check();
          else void next();
        }}
        className="grid gap-2"
      >
        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,10rem),1fr))] gap-2">
          {fields.map((label, i) => (
            <label key={label} className="grid min-w-0 gap-1 text-xs font-bold text-zinc-300">
              {label}
              <input
                ref={i === 0 ? firstInput : undefined}
                aria-label={label}
                inputMode="numeric"
                value={inputs[i] ?? ""}
                disabled={checked !== null}
                onChange={(e) => {
                  const next = [...inputs];
                  next[i] = e.target.value.replace(/[^\d,]/g, "");
                  setInputs(next);
                }}
                className={cn(
                  "h-12 w-full min-w-0 rounded-lg border-2 bg-black px-2 text-xl font-black tabular-nums",
                  checked === null ? "border-white/20" : readNumber(inputs[i] ?? "") === answers[i] ? "border-emerald-500" : "border-rose-500",
                )}
              />
              {checked !== null && readNumber(inputs[i] ?? "") !== answers[i] ? <span className="text-rose-300">정답 {won(answers[i])}</span> : null}
            </label>
          ))}
        </div>
        {checked !== null && question && answer ? (
          <div data-feedback className={cn("grid gap-1.5 rounded-xl px-3 py-2", checked ? "bg-emerald-950" : "bg-rose-950")}>
            <p className={cn("text-lg font-black", checked ? "text-emerald-200" : "text-rose-200")}>{checked ? "정답!" : "틀렸습니다"}</p>
            <p className="text-xs font-bold text-zinc-300">풀이</p>
            <ol data-explain className="grid gap-1 text-sm text-zinc-100">
              {explainPots(question.players, answer).map((line) => (
                <li key={line} className="rounded-lg bg-black/40 px-2 py-1 tabular-nums">
                  {line}
                </li>
              ))}
            </ol>
          </div>
        ) : null}
        <button type="submit" className="min-h-12 rounded-xl bg-amber-400 text-lg font-black text-black">
          {checked === null ? "확인" : index + 1 >= ROUND_SIZE ? "결과 보기" : "다음 문제"}
        </button>
      </form>
    </section>
  );
}

/* ───────────── 사이드팟 계산기(실전) ───────────── */

function SidePotCalculator() {
  const [players, setPlayers] = useState<{ name: string; amount: string; folded: boolean }[]>(() =>
    [1, 2, 3].map((i) => ({ name: `${i}번`, amount: "", folded: false })),
  );
  const [ante, setAnte] = useState("");
  const [winners, setWinners] = useState<number[][]>([]);
  const parsed: PotPlayer[] = players.map((p) => ({ name: p.name || "?", amount: readNumber(p.amount), folded: p.folded }));
  const result = computePots(parsed, { deadMain: readNumber(ante) });
  const ready = parsed.filter((p) => p.amount > 0).length >= 2;
  const pay = payouts(parsed, result, winners);
  const set = (i: number, patch: Partial<(typeof players)[number]>) => {
    setPlayers(players.map((p, j) => (j === i ? { ...p, ...patch } : p)));
    setWinners([]);
  };
  const names = (ids: number[]) => ids.map((i) => parsed[i].name).join(", ");

  return (
    <section aria-label="사이드팟 계산기" className="poka-watermark grid gap-3 rounded-2xl border border-white/15 bg-zinc-950 p-3 sm:p-4">
      <div>
        <h2 className="text-lg font-black">사이드팟 계산기</h2>
        <p className="text-xs text-zinc-400">현장용입니다. 사람(포지션)마다 이번 핸드에 낸 칩 합계를 넣으세요. 폴드한 사람도 낸 만큼은 팟에 들어갑니다.</p>
      </div>
      <ul className="grid gap-1.5">
        {players.map((p, i) => (
          <li key={i} data-player={i} className={cn("flex flex-wrap items-center gap-1.5 rounded-lg bg-black px-2 py-1.5", p.folded && "opacity-60")}>
            <input
              aria-label="이름"
              value={p.name}
              maxLength={10}
              onChange={(e) => set(i, { name: e.target.value })}
              className="h-10 w-20 min-w-0 rounded-lg border border-white/20 bg-zinc-900 px-2 text-sm font-bold"
            />
            <input
              aria-label={`${p.name} 낸 금액`}
              inputMode="numeric"
              value={p.amount}
              placeholder="낸 금액"
              onChange={(e) => set(i, { amount: e.target.value.replace(/[^\d,]/g, "") })}
              className="h-10 min-w-0 flex-1 rounded-lg border border-white/20 bg-zinc-900 px-2 text-base font-black tabular-nums"
            />
            <label className="flex items-center gap-1 text-xs font-bold text-zinc-300">
              <input type="checkbox" checked={p.folded} onChange={(e) => set(i, { folded: e.target.checked })} className="size-5" />
              폴드
            </label>
            <button
              type="button"
              disabled={players.length <= 2}
              onClick={() => {
                setPlayers(players.filter((_, j) => j !== i));
                setWinners([]);
              }}
              className="min-h-9 rounded px-2 text-xs text-zinc-400 hover:bg-white/10 disabled:opacity-30"
            >
              빼기
            </button>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={players.length >= 10}
          onClick={() => setPlayers([...players, { name: `${players.length + 1}번`, amount: "", folded: false }])}
          className="min-h-10 rounded-lg bg-emerald-500 px-3 text-sm font-black text-black disabled:opacity-40"
        >
          + 사람 추가
        </button>
        <button
          type="button"
          onClick={() => {
            setPlayers([1, 2, 3].map((i) => ({ name: `${i}번`, amount: "", folded: false })));
            setAnte("");
            setWinners([]);
          }}
          className="min-h-10 rounded-lg border border-white/25 px-3 text-sm font-bold"
        >
          비우기
        </button>
        <label className="ml-auto flex items-center gap-1.5 text-xs font-bold text-zinc-300">
          앤티(메인 팟에)
          <input
            aria-label="앤티"
            inputMode="numeric"
            value={ante}
            placeholder="0"
            onChange={(e) => {
              setAnte(e.target.value.replace(/[^\d,]/g, ""));
              setWinners([]);
            }}
            className="h-10 w-28 rounded-lg border border-white/20 bg-zinc-900 px-2 text-base font-black tabular-nums"
          />
        </label>
      </div>

      {ready ? (
        <div data-pot-result className="grid gap-2">
          <p className="text-sm text-zinc-300">
            팟 전체 <b className="text-white">{won(result.total)}</b>
          </p>
          {result.pots.map((pot, index) => (
            <div key={index} data-pot={index} className="grid gap-1.5 rounded-xl border border-amber-400/50 bg-amber-950/30 p-2">
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="text-lg font-black text-amber-300">{potName(index)}</span>
                <span className="text-2xl font-black tabular-nums">{won(pot.amount)}</span>
                <span className="text-xs text-zinc-300">가져갈 수 있는 사람: {pot.eligible.length ? names(pot.eligible) : "없음"}</span>
              </div>
              {pot.eligible.length > 1 ? (
                <div className="flex flex-wrap items-center gap-1 text-xs">
                  <span className="text-zinc-400">이긴 사람(나눠 가지면 여럿):</span>
                  {pot.eligible.map((i) => {
                    const on = (winners[index] ?? []).includes(i);
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          const next = [...winners];
                          const cur = next[index] ?? [];
                          next[index] = on ? cur.filter((x) => x !== i) : [...cur, i];
                          setWinners(next);
                        }}
                        className={cn("min-h-9 rounded-lg px-2.5 font-black", on ? "bg-emerald-500 text-black" : "border border-white/25 text-zinc-200")}
                      >
                        {parsed[i].name}
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>
          ))}
          {result.refund ? (
            <p data-refund className="rounded-lg bg-sky-950 px-2 py-1.5 text-sm font-bold text-sky-200">
              {parsed[result.refund.player].name}에게 {won(result.refund.amount)} 돌려주기(콜 받지 못한 금액)
            </p>
          ) : null}
          <details className="rounded-lg bg-black/40 p-2 text-sm">
            <summary className="cursor-pointer font-bold text-zinc-300">풀이 보기</summary>
            <ol className="mt-1 grid gap-1">
              {explainPots(parsed, result).map((line) => (
                <li key={line} className="tabular-nums text-zinc-100">
                  {line}
                </li>
              ))}
            </ol>
          </details>
          {winners.some((w) => w?.length) ? (
            <div className="grid gap-1 rounded-xl bg-black p-2">
              <p className="text-sm font-black">받을 금액</p>
              {parsed.map((p, i) =>
                pay.pay[i] ? (
                  <p key={i} data-pay={i} className="flex justify-between text-base font-bold tabular-nums">
                    <span>{p.name}</span>
                    <span className="text-emerald-300">{won(pay.pay[i])}</span>
                  </p>
                ) : null,
              )}
              {pay.oddChips.length ? <p className="text-[11px] text-zinc-400">나누어떨어지지 않는 칩은 앞 사람부터 1씩 줬습니다(실제로는 버튼 왼쪽부터).</p> : null}
            </div>
          ) : (
            <p className="text-xs text-zinc-400">팟마다 이긴 사람을 누르면 각자 받을 금액이 나옵니다.</p>
          )}
        </div>
      ) : (
        <p className="text-sm text-zinc-400">두 사람 이상 금액을 넣으면 메인 · 세컨 · 서드 팟…이 바로 나옵니다.</p>
      )}
    </section>
  );
}

/* ───────────── 기록 · 랭킹 ───────────── */

function Ranking({ board }: { board: Board | null }) {
  if (!board) return <p className="text-sm text-zinc-400">불러오는 중…</p>;
  const data = board.sidepot ?? { top: [], best: null };
  return (
    <section data-rank="sidepot" className="grid gap-2 rounded-2xl border border-white/15 bg-zinc-950 p-3">
      <h2 className="text-base font-black">{PRACTICE_KINDS.sidepot} 랭킹</h2>
      {data.best ? (
        <p className="text-sm font-bold text-amber-300">
          내 최고: {data.best.correct}/{ROUND_SIZE} · {secText(data.best.durationMs)}
        </p>
      ) : (
        <p className="text-sm text-zinc-400">아직 내 기록이 없습니다.</p>
      )}
      <ol className="grid gap-1">
        {data.top.length ? (
          data.top.map((row, i) => (
            <li key={i} className={cn("flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm", row.mine ? "bg-amber-950 ring-1 ring-amber-400" : "bg-black")}>
              <span className={cn("w-6 text-center font-black", i < 3 ? "text-amber-300" : "text-zinc-400")}>{i + 1}</span>
              <span className="min-w-0 flex-1 truncate font-bold">{row.nickname}</span>
              <span className="font-black tabular-nums">
                {row.correct}/{ROUND_SIZE}
              </span>
              <span className="w-20 text-right text-xs tabular-nums text-zinc-400">{secText(row.durationMs)}</span>
            </li>
          ))
        ) : (
          <li className="text-sm text-zinc-500">첫 기록의 주인공이 되어 보세요.</li>
        )}
      </ol>
    </section>
  );
}
