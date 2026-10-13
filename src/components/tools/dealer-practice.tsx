"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "cn";
import { computePots, payouts, potName, type PotPlayer } from "@/lib/side-pot";
import { CHIP_TYPES, PRACTICE_KINDS, ROUND_SIZE, chipsProblem, readNumber, sidePotProblem, type ChipsProblem, type PracticeKind, type SidePotProblem } from "@/lib/practice";

/** 지금 시각(ms) — 화면 그리기와 상관없는 기록용 */
const nowMs = () => Date.now();
const won = (n: number) => Math.round(n).toLocaleString("ko-KR");
const secText = (ms: number) => `${Math.floor(ms / 60000) ? `${Math.floor(ms / 60000)}분 ` : ""}${((ms % 60000) / 1000).toFixed(1)}초`;

type Row = { nickname: string; correct: number; durationMs: number; at: string; mine: boolean };
type Board = Record<PracticeKind, { top: Row[]; best: Row | null }>;

/** 딜러 연습장: 사이드팟 계산기(실전) · 사이드팟 연습 · 칩 세기 연습 · 기록 */
export function DealerPractice() {
  const [tab, setTab] = useState<"calc" | PracticeKind | "board">("calc");
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
      <nav role="tablist" aria-label="딜러 연습장" className="grid grid-cols-2 gap-1 rounded-2xl border border-white/15 bg-zinc-950 p-1 sm:grid-cols-4">
        {(
          [
            ["calc", "사이드팟 계산기"],
            ["sidepot", "사이드팟 연습"],
            ["chips", "칩 세기 연습"],
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
      {tab === "calc" ? <SidePotCalculator /> : null}
      {tab === "sidepot" || tab === "chips" ? <Drill key={tab} kind={tab} best={board?.[tab]?.best ?? null} onSaved={setBoard} /> : null}
      {tab === "board" ? <Ranking board={board} /> : null}
    </div>
  );
}

/* ───────────── 사이드팟 계산기 ───────────── */

function SidePotCalculator() {
  const [players, setPlayers] = useState<{ name: string; amount: string; folded: boolean }[]>(() =>
    [1, 2, 3].map((i) => ({ name: `${i}번`, amount: "", folded: false })),
  );
  const [winners, setWinners] = useState<number[][]>([]);
  const parsed: PotPlayer[] = players.map((p) => ({ name: p.name || "?", amount: readNumber(p.amount), folded: p.folded }));
  const result = computePots(parsed);
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
        <p className="text-xs text-zinc-400">사람마다 이번 핸드에 낸 칩 합계를 넣으세요. 폴드한 사람도 낸 만큼은 팟에 들어갑니다.</p>
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
      <div className="flex flex-wrap gap-2">
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
            setWinners([]);
          }}
          className="min-h-10 rounded-lg border border-white/25 px-3 text-sm font-bold"
        >
          비우기
        </button>
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
        <p className="text-sm text-zinc-400">두 사람 이상 금액을 넣으면 메인팟·사이드팟이 바로 나옵니다.</p>
      )}
    </section>
  );
}

/* ───────────── 연습(10문제) ───────────── */

type Question = { kind: "sidepot"; q: SidePotProblem } | { kind: "chips"; q: ChipsProblem };

function newQuestion(kind: PracticeKind): Question {
  return kind === "sidepot" ? { kind, q: sidePotProblem() } : { kind, q: chipsProblem() };
}

function Drill({ kind, best, onSaved }: { kind: PracticeKind; best: Row | null; onSaved: (board: Board) => void }) {
  const [phase, setPhase] = useState<"ready" | "play" | "done">("ready");
  const [index, setIndex] = useState(0);
  const [question, setQuestion] = useState<Question | null>(null);
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

  const fields = !question ? [] : question.kind === "sidepot" ? [...question.q.answer.pots.map((_, i) => potName(i)), ...(question.q.answer.refund ? ["돌려줄 금액"] : [])] : ["칩 합계"];
  const answers = !question ? [] : question.kind === "sidepot" ? [...question.q.answer.pots.map((p) => p.amount), ...(question.q.answer.refund ? [question.q.answer.refund.amount] : [])] : [question.q.answer];

  function start() {
    setPhase("play");
    setIndex(0);
    setCorrect(0);
    setSaved(null);
    const q = newQuestion(kind);
    setQuestion(q);
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
      const total = correct;
      try {
        const res = await fetch("/api/tools/practice", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ kind, correct: total, durationMs }),
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
    setQuestion(newQuestion(kind));
    setInputs([]);
    setChecked(null);
  }

  if (phase === "ready") {
    return (
      <section className="grid gap-3 rounded-2xl border border-white/15 bg-zinc-950 p-4">
        <h2 className="text-lg font-black">{PRACTICE_KINDS[kind]} 연습</h2>
        <p className="text-sm text-zinc-300">
          {kind === "sidepot"
            ? "올인 상황이 나오면 메인팟·사이드팟(그리고 돌려줄 금액)을 계산해 넣으세요."
            : "칩 더미를 보고 합계를 계산해 넣으세요. 칩마다 금액이 적혀 있습니다."}{" "}
          {ROUND_SIZE}문제, 맞힌 수가 많고 빠를수록 높은 기록입니다.
        </p>
        {best ? (
          <p className="text-sm font-bold text-amber-300">
            내 최고 기록: {best.correct}/{ROUND_SIZE} · {secText(best.durationMs)}
          </p>
        ) : null}
        <button type="button" onClick={start} className="min-h-12 justify-self-start rounded-xl bg-amber-400 px-8 text-lg font-black text-black">
          시작
        </button>
      </section>
    );
  }

  if (phase === "done") {
    return (
      <section data-drill-done className="grid gap-3 rounded-2xl border-2 border-emerald-500 bg-emerald-950/30 p-4">
        <h2 className="text-lg font-black">{PRACTICE_KINDS[kind]} 끝!</h2>
        <p className="text-3xl font-black">
          {correct}/{ROUND_SIZE} <span className="text-lg text-zinc-300">· {secText(elapsed)}</span>
        </p>
        {saved ? <p className="text-sm text-zinc-300">{saved}</p> : null}
        <button type="button" onClick={start} className="min-h-11 justify-self-start rounded-xl bg-amber-400 px-6 text-base font-black text-black">
          다시 하기
        </button>
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

      {question?.kind === "sidepot" ? (
        <div className="grid gap-1.5">
          <p className="text-sm text-zinc-300">이번 핸드에 낸 칩입니다. 팟을 나눠 보세요.</p>
          <ul className="grid gap-1">
            {question.q.players.map((p, i) => (
              <li key={i} className={cn("flex items-center gap-2 rounded-lg bg-black px-3 py-2", p.folded && "opacity-60")}>
                <span className="w-12 font-black">{p.name}</span>
                <span className="flex-1 text-lg font-black tabular-nums">{won(p.amount)}</span>
                <span
                  className={cn(
                    "rounded px-2 py-0.5 text-xs font-black",
                    p.folded ? "bg-zinc-700 text-zinc-200" : p.allIn ? "bg-rose-600 text-white" : "bg-emerald-600 text-white",
                  )}
                >
                  {p.folded ? "폴드" : p.allIn ? "올인" : "콜/베팅"}
                </span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-zinc-400">
            팟 {question.q.answer.pots.length}개{question.q.answer.refund ? " + 돌려줄 금액 있음" : ""}
          </p>
        </div>
      ) : question?.kind === "chips" ? (
        <div className="flex flex-wrap items-end justify-center gap-5 rounded-xl bg-[#0f2a1d] p-4">
          {question.q.stacks.map((s) => {
            const type = CHIP_TYPES.find((c) => c.value === s.value)!;
            return (
              <div key={s.value} className="grid justify-items-center gap-1">
                <div className="flex flex-col-reverse items-center">
                  {Array.from({ length: s.count }, (_, i) => (
                    <span
                      key={i}
                      className="-mt-1 block h-3 w-14 rounded-[50%] border-2"
                      style={{ background: type.color, borderColor: type.edge, boxShadow: "0 1px 0 rgba(0,0,0,.5)" }}
                    />
                  ))}
                </div>
                <span className="rounded px-1.5 text-xs font-black" style={{ background: type.color, color: type.text }}>
                  {won(s.value)}
                </span>
              </div>
            );
          })}
        </div>
      ) : null}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (checked === null) check();
          else void next();
        }}
        className="grid gap-2"
      >
        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,11rem),1fr))] gap-2">
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
        {checked !== null ? (
          <p data-feedback className={cn("rounded-lg px-3 py-2 text-base font-black", checked ? "bg-emerald-950 text-emerald-200" : "bg-rose-950 text-rose-200")}>
            {checked ? "정답!" : "틀렸습니다"}
            {question?.kind === "sidepot" && !checked
              ? ` — ${question.q.answer.pots.map((p, i) => `${potName(i)} ${won(p.amount)}(${p.eligible.map((x) => question.q.players[x].name).join("·")})`).join(", ")}${question.q.answer.refund ? `, ${question.q.players[question.q.answer.refund.player].name}에게 ${won(question.q.answer.refund.amount)} 돌려줌` : ""}`
              : ""}
          </p>
        ) : null}
        <button type="submit" className="min-h-12 rounded-xl bg-amber-400 text-lg font-black text-black">
          {checked === null ? "확인" : index + 1 >= ROUND_SIZE ? "결과 보기" : "다음 문제"}
        </button>
      </form>
    </section>
  );
}

/* ───────────── 기록 · 랭킹 ───────────── */

function Ranking({ board }: { board: Board | null }) {
  if (!board) return <p className="text-sm text-zinc-400">불러오는 중…</p>;
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {(Object.keys(PRACTICE_KINDS) as PracticeKind[]).map((kind) => (
        <section key={kind} data-rank={kind} className="grid gap-2 rounded-2xl border border-white/15 bg-zinc-950 p-3">
          <h2 className="text-base font-black">{PRACTICE_KINDS[kind]} 랭킹</h2>
          {board[kind].best ? (
            <p className="text-sm font-bold text-amber-300">
              내 최고: {board[kind].best!.correct}/{ROUND_SIZE} · {secText(board[kind].best!.durationMs)}
            </p>
          ) : (
            <p className="text-sm text-zinc-400">아직 내 기록이 없습니다.</p>
          )}
          <ol className="grid gap-1">
            {board[kind].top.length ? (
              board[kind].top.map((row, i) => (
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
      ))}
    </div>
  );
}
