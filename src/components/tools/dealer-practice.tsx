"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "cn";
import { computePots, explainPots, payouts, potName, type PotPlayer } from "@/lib/side-pot";
import {
  DEFAULT_BLINDS,
  DIFFICULTIES,
  DIFFICULTY,
  ROUND_SIZE,
  actionText,
  kindOf,
  potProblem,
  readNumber,
  validBlinds,
  type Blinds,
  type Difficulty,
  type PotProblem,
} from "@/lib/practice";

/** 지금 시각(ms) — 화면 그리기와 상관없는 기록용 */
const nowMs = () => Date.now();
const won = (n: number) => Math.round(n).toLocaleString("ko-KR");
const secText = (ms: number) => `${Math.floor(ms / 60000) ? `${Math.floor(ms / 60000)}분 ` : ""}${((ms % 60000) / 1000).toFixed(1)}초`;
const SETTINGS_KEY = "poka-practice-settings-v2";

type Row = { nickname: string; correct: number; durationMs: number; at: string; mine: boolean };
type Board = Record<string, { top: Row[]; best: Row | null }>;

/** 딜러 연습장: 팟 계산(연습 + 바로 아래 랭킹) · 사이드팟 계산기(실전) */
export function DealerPractice() {
  const [tab, setTab] = useState<"drill" | "calc">("drill");
  const [board, setBoard] = useState<Board | null>(null);
  const [settings, setSettings] = useSettings();

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
      <nav role="tablist" aria-label="딜러 연습장" className="grid grid-cols-2 gap-1 rounded-2xl border border-white/15 bg-zinc-950 p-1">
        {(
          [
            ["drill", "팟 계산"],
            ["calc", "사이드팟 계산기"],
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
      {tab === "drill" ? (
        <>
          <PotDrill settings={settings} onSettings={setSettings} best={board?.[kindOf(settings.difficulty)]?.best ?? null} onSaved={setBoard} />
          <Ranking board={board} difficulty={settings.difficulty} />
        </>
      ) : null}
      {tab === "calc" ? <SidePotCalculator /> : null}
    </div>
  );
}

/* ───────────── 설정(난이도 · 블라인드) ───────────── */

type Settings = { difficulty: Difficulty; blinds: Blinds };

function useSettings() {
  const [settings, setSettings] = useState<Settings>({ difficulty: "normal", blinds: DEFAULT_BLINDS });
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(SETTINGS_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Settings;
        // eslint-disable-next-line react-hooks/set-state-in-effect -- 저장된 값은 화면이 뜬 뒤에만 읽을 수 있습니다.
        if (DIFFICULTIES.includes(saved.difficulty) && validBlinds(saved.blinds)) setSettings(saved);
      }
    } catch {
      /* 기본값 */
    }
  }, []);
  const save = (next: Settings) => {
    setSettings(next);
    try {
      if (validBlinds(next.blinds)) window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
    } catch {
      /* 무시 */
    }
  };
  return [settings, save] as const;
}

function SettingsForm({ settings, onChange }: { settings: Settings; onChange: (s: Settings) => void }) {
  const { blinds } = settings;
  const ok = validBlinds(blinds);
  return (
    <div className="grid gap-3">
      <div className="grid gap-1.5">
        <span className="text-xs font-bold text-zinc-300">난이도</span>
        <div role="radiogroup" aria-label="난이도" className="grid gap-1.5 sm:grid-cols-3">
          {DIFFICULTIES.map((d) => (
            <button
              key={d}
              type="button"
              role="radio"
              aria-checked={settings.difficulty === d}
              onClick={() => onChange({ ...settings, difficulty: d })}
              className={cn(
                "grid gap-0.5 rounded-xl border-2 px-3 py-2 text-left",
                settings.difficulty === d ? "border-amber-400 bg-amber-950/40" : "border-white/15 bg-black hover:border-white/30",
              )}
            >
              <span className={cn("text-base font-black", settings.difficulty === d ? "text-amber-300" : "text-white")}>{DIFFICULTY[d].label}</span>
              <span className="text-[11px] text-zinc-400">{DIFFICULTY[d].desc}</span>
            </button>
          ))}
        </div>
      </div>
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
              onChange={(e) => onChange({ ...settings, blinds: { ...blinds, [key]: readNumber(e.target.value) } })}
              className="h-11 w-full min-w-0 rounded-lg border border-white/20 bg-black px-2 text-base font-black tabular-nums"
            />
          </label>
        ))}
      </div>
      {!ok ? <p className="text-xs font-bold text-rose-300">SB는 BB보다 작거나 같아야 하고, 0보다 커야 합니다.</p> : null}
    </div>
  );
}

/* ───────────── 9인 홀덤 테이블(액션 재생) ───────────── */

const FINAL: Record<string, { label: string; tone: string }> = {
  allin: { label: "올인", tone: "bg-rose-600 text-white" },
  bet: { label: "레이즈", tone: "bg-emerald-500 text-black" },
  call: { label: "콜", tone: "bg-sky-500 text-black" },
  fold: { label: "폴드", tone: "bg-zinc-600 text-zinc-100" },
};
const LIVE_TONE: Record<string, string> = {
  sb: "bg-zinc-200 text-black",
  bb: "bg-zinc-200 text-black",
  ante: "bg-amber-200 text-black",
  fold: "bg-zinc-600 text-zinc-100",
  check: "bg-zinc-300 text-black",
  call: "bg-sky-500 text-black",
  raise: "bg-emerald-500 text-black",
  allin: "bg-rose-600 text-white",
};

/**
 * 실제 9인 테이블 자리(시계 방향, 맨 위 가운데는 딜러): 위 2 · 오른쪽 2 · 아래 3 · 왼쪽 2.
 * PC는 가로 테이블, 휴대폰은 세로 테이블 좌표를 따로 씁니다(%).
 */
const SEATS_PC = [
  [71, 11],
  [91, 31],
  [91, 69],
  [71, 89],
  [50, 91],
  [29, 89],
  [9, 69],
  [9, 31],
  [29, 11],
] as const;
const SEATS_MOBILE = [
  [74, 9],
  [87, 32],
  [87, 64],
  [76, 89],
  [50, 94],
  [24, 89],
  [13, 64],
  [13, 32],
  [26, 9],
] as const;
/** 칩(베팅 금액) 자리: 좌석에서 가운데 쪽으로 */
const toward = (v: number, f = 0.52) => 50 + (v - 50) * f;
/** 휴대폰 · PC 좌표를 CSS 변수로(작은 화면 먼저, sm부터 PC) */
function place(m: readonly [number, number], d: readonly [number, number]) {
  return { "--mx": `${m[0]}%`, "--my": `${m[1]}%`, "--dx": `${d[0]}%`, "--dy": `${d[1]}%` } as React.CSSProperties;
}
const PLACED = "left-[var(--mx)] top-[var(--my)] sm:left-[var(--dx)] sm:top-[var(--dy)]";

function HoldemTable({ problem, step }: { problem: PotProblem; step: number }) {
  const { seats, actions, blinds, button } = problem;
  const done = step >= actions.length;
  const view = useMemo(() => {
    const contrib = Array(9).fill(0);
    const folded = Array(9).fill(false);
    const last: (string | null)[] = Array(9).fill(null);
    const lastType: (string | null)[] = Array(9).fill(null);
    for (const a of actions.slice(0, step)) {
      if (a.type !== "ante") contrib[a.seat] = a.to;
      if (a.type === "fold") folded[a.seat] = true;
      last[a.seat] = actionText(a, blinds);
      lastType[a.seat] = a.type;
    }
    return { contrib, folded, last, lastType, actor: step > 0 ? actions[step - 1].seat : -1 };
  }, [actions, step, blinds]);

  return (
    <div data-table className="relative mx-auto aspect-[3/4] w-full max-w-4xl sm:aspect-[16/9]">
      {/* 레일 + 펠트(레이스트랙 모양) */}
      <div className="absolute inset-[11%_17%] rounded-[999px] bg-[#3b2414] p-[2.2%] shadow-[0_10px_30px_rgba(0,0,0,.7)] sm:inset-[15%_13%]">
        <div className="relative h-full w-full rounded-[999px] border-2 border-[#c9a25c]/40 bg-[radial-gradient(ellipse_at_center,#1f8a52_0%,#136b3d_55%,#0b4a29_100%)] shadow-[inset_0_0_40px_rgba(0,0,0,.55)]">
          <div className="absolute inset-[16%_12%] rounded-[999px] border border-white/15" />
        </div>
      </div>
      {/* 딜러 자리 */}
      <div className={cn("absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-black/80 px-2 py-0.5 text-[10px] font-black tracking-widest text-amber-200", PLACED)} style={place([50, 7], [50, 9])}>
        DEALER
      </div>
      {/* 가운데: 블라인드 · 진행 */}
      <div className="absolute inset-0 grid place-items-center text-center">
        <div className="grid gap-0.5 rounded-xl bg-black/45 px-3 py-1.5">
          {/* eslint-disable-next-line @next/next/no-img-element -- 작은 마크 */}
          <img src="/brand/poka-oni-mark.png" alt="" className="mx-auto h-auto w-8 opacity-80" />
          <span className="text-xs font-black text-white sm:text-sm">
            SB {won(blinds.sb)} · BB {won(blinds.bb)}
          </span>
          {blinds.ante ? <span className="text-[10px] font-bold text-amber-200">BB 앤티 {won(blinds.ante)} → 메인 팟</span> : null}
          <span className={cn("text-[11px] font-black", done ? "text-emerald-200" : "text-amber-200")}>
            {done ? "액션 끝 — 팟을 계산하세요" : `프리플랍 진행 중 ${step}/${actions.length}`}
          </span>
        </div>
      </div>
      {seats.map((seat) => {
        const m = SEATS_MOBILE[seat.seat];
        const d = SEATS_PC[seat.seat];
        const folded = view.folded[seat.seat];
        const contrib = view.contrib[seat.seat];
        const isActor = view.actor === seat.seat && !done;
        const label = done ? (seat.note ?? FINAL[seat.action].label) : view.last[seat.seat];
        const tone = done ? FINAL[seat.action].tone : view.lastType[seat.seat] ? LIVE_TONE[view.lastType[seat.seat] as string] : "";
        return (
          <div key={seat.seat}>
            <div
              data-seat={seat.position}
              className={cn(
                "absolute grid w-[21%] max-w-[8rem] min-w-[4.3rem] -translate-x-1/2 -translate-y-1/2 justify-items-center gap-0.5 rounded-xl border px-1 py-1 text-center shadow-lg transition-all duration-300 sm:w-[12.5%]",
                PLACED,
                folded ? "border-white/10 bg-zinc-900/90 opacity-60" : "border-amber-300/50 bg-black/90",
                isActor && "z-10 scale-110 border-amber-300 ring-2 ring-amber-300",
              )}
              style={place(m, d)}
            >
              <span className="flex items-center gap-1 text-xs font-black text-amber-300 sm:text-sm">
                {/* 카드 두 장(폴드하면 사라짐) */}
                <span className={cn("flex gap-px transition-opacity duration-500", folded ? "opacity-0" : "opacity-100")} aria-hidden>
                  <span className="block h-3.5 w-2.5 rounded-[2px] border border-white/60 bg-[repeating-linear-gradient(45deg,#7f1d1d_0_2px,#991b1b_2px_4px)]" />
                  <span className="block h-3.5 w-2.5 rounded-[2px] border border-white/60 bg-[repeating-linear-gradient(45deg,#7f1d1d_0_2px,#991b1b_2px_4px)]" />
                </span>
                {seat.position}
                {seat.seat === button ? <span className="grid size-4 place-items-center rounded-full bg-white text-[9px] text-black">D</span> : null}
              </span>
              <span className="text-[10px] tabular-nums text-zinc-400">스택 {won(Math.max(0, seat.stack - contrib))}</span>
              {label ? <span data-act className={cn("rounded px-1 text-[10px] font-black whitespace-nowrap sm:text-[11px]", tone)}>{label}</span> : <span className="h-[15px]" />}
            </div>
            {contrib ? (
              <span
                data-bet={seat.position}
                className={cn(
                  "absolute flex -translate-x-1/2 -translate-y-1/2 items-center gap-1 rounded-full bg-black/65 px-1.5 py-0.5 text-[10px] font-black tabular-nums text-amber-100 transition-all duration-500 sm:text-xs",
                  PLACED,
                  folded && "opacity-60",
                )}
                style={place([toward(m[0], 0.5), toward(m[1], 0.56)], [toward(d[0], 0.6), toward(d[1], 0.5)])}
              >
                <span className="inline-block size-2.5 rounded-full border border-white/70 bg-rose-600" />
                {won(contrib)}
              </span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

/* ───────────── 팟 계산 연습(10문제) ───────────── */

function PotDrill({
  settings,
  onSettings,
  best,
  onSaved,
}: {
  settings: Settings;
  onSettings: (s: Settings) => void;
  best: Row | null;
  onSaved: (board: Board) => void;
}) {
  const [phase, setPhase] = useState<"ready" | "play" | "done">("ready");
  const [index, setIndex] = useState(0);
  const [question, setQuestion] = useState<PotProblem | null>(null);
  const [step, setStep] = useState(0);
  const [inputs, setInputs] = useState<string[]>([]);
  const [checked, setChecked] = useState<boolean | null>(null);
  const [correct, setCorrect] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [saved, setSaved] = useState<string | null>(null);
  const startRef = useRef(0);
  const firstInput = useRef<HTMLInputElement>(null);
  const playing = Boolean(question && step < question.actions.length);
  const conf = DIFFICULTY[settings.difficulty];

  // 시간
  useEffect(() => {
    if (phase !== "play") return;
    const t = window.setInterval(() => setElapsed(nowMs() - startRef.current), 100);
    return () => window.clearInterval(t);
  }, [phase]);
  // 액션 재생: 한 명씩
  useEffect(() => {
    if (phase !== "play" || !question || step >= question.actions.length) return;
    const t = window.setTimeout(() => setStep((s) => s + 1), step === 0 ? 400 : conf.speed);
    return () => window.clearTimeout(t);
  }, [phase, question, step, conf.speed]);
  useEffect(() => {
    if (phase === "play" && !playing && checked === null) firstInput.current?.focus();
  }, [phase, playing, checked, index]);

  const answer = question?.answer;
  const fields = answer ? [...answer.pots.map((_, i) => potName(i)), ...(answer.refund ? ["돌려줄 금액"] : [])] : [];
  const answers = answer ? [...answer.pots.map((p) => p.amount), ...(answer.refund ? [answer.refund.amount] : [])] : [];

  function load() {
    setQuestion(potProblem(settings.difficulty, validBlinds(settings.blinds) ? settings.blinds : DEFAULT_BLINDS));
    setStep(0);
    setInputs([]);
    setChecked(null);
  }

  function start() {
    if (!validBlinds(settings.blinds)) return;
    setPhase("play");
    setIndex(0);
    setCorrect(0);
    setSaved(null);
    load();
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
          body: JSON.stringify({ kind: kindOf(settings.difficulty), correct, durationMs }),
        });
        const data = (await res.json()) as { board?: Board; error?: string };
        if (data.board) onSaved(data.board);
        setSaved(res.ok ? "기록을 저장했습니다. 아래 랭킹을 확인하세요." : (data.error ?? "기록을 저장하지 못했습니다."));
      } catch {
        setSaved("기록을 저장하지 못했습니다.");
      }
      return;
    }
    setIndex(index + 1);
    load();
  }

  if (phase === "ready") {
    return (
      <section className="grid gap-3 rounded-2xl border border-white/15 bg-zinc-950 p-4">
        <h2 className="text-lg font-black">팟 계산 연습</h2>
        <p className="text-sm text-zinc-300">
          9인 테이블에서 블라인드부터 한 명씩 <b className="text-white">폴드 · 체크 · 콜 · 레이즈 · 올인</b>이 진행됩니다. 액션이 끝나면{" "}
          <b className="text-amber-300">메인 · 세컨 · 서드 · 포스 · 피프스 팟</b>(그리고 돌려줄 금액)을 계산해 넣으세요. 틀리면 풀이가 나옵니다. {ROUND_SIZE}문제, 맞힌 수가 많고 빠를수록 높은 기록입니다.
        </p>
        <SettingsForm settings={settings} onChange={onSettings} />
        {best ? (
          <p className="text-sm font-bold text-amber-300">
            {conf.label} 내 최고 기록: {best.correct}/{ROUND_SIZE} · {secText(best.durationMs)}
          </p>
        ) : null}
        <button
          type="button"
          onClick={start}
          disabled={!validBlinds(settings.blinds)}
          className="min-h-12 justify-self-start rounded-xl bg-amber-400 px-8 text-lg font-black text-black disabled:opacity-40"
        >
          {conf.label} 시작
        </button>
      </section>
    );
  }

  if (phase === "done") {
    return (
      <section data-drill-done className="grid gap-3 rounded-2xl border-2 border-emerald-500 bg-emerald-950/30 p-4">
        <h2 className="text-lg font-black">팟 계산 · {conf.label} 끝!</h2>
        <p className="text-3xl font-black">
          {correct}/{ROUND_SIZE} <span className="text-lg text-zinc-300">· {secText(elapsed)}</span>
        </p>
        {saved ? <p className="text-sm text-zinc-300">{saved}</p> : null}
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={start} className="min-h-11 rounded-xl bg-amber-400 px-6 text-base font-black text-black">
            다시 하기
          </button>
          <button type="button" onClick={() => setPhase("ready")} className="min-h-11 rounded-xl border border-white/25 px-4 text-sm font-bold">
            난이도 · 블라인드 바꾸기
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
        <span className="rounded-full border border-white/20 px-2 py-0.5 text-xs">{conf.label}</span>
        <span className="text-emerald-300">맞힘 {correct}</span>
        <span className="ml-auto tabular-nums text-zinc-300">{secText(elapsed)}</span>
      </div>

      {question ? <HoldemTable problem={question} step={step} /> : null}

      <div className="flex flex-wrap items-center justify-center gap-2">
        {playing ? (
          <button type="button" onClick={() => question && setStep(question.actions.length)} className="min-h-10 rounded-lg border border-white/25 px-4 text-sm font-bold">
            건너뛰기 ▶▶
          </button>
        ) : (
          <button type="button" onClick={() => setStep(0)} className="min-h-10 rounded-lg border border-white/25 px-4 text-sm font-bold">
            액션 다시 보기 ↺
          </button>
        )}
        {!playing && answer ? (
          <span className="text-xs font-bold text-zinc-400">
            팟 {answer.pots.length}개({answer.pots.map((_, i) => potName(i)).join(" · ")}){answer.refund ? " + 돌려줄 금액 있음" : ""}
          </span>
        ) : null}
      </div>

      {!playing && question ? (
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
          {checked !== null && answer ? (
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
      ) : null}
    </section>
  );
}

/* ───────────── 랭킹(팟 계산 바로 아래, 난이도별 10명) ───────────── */

function Ranking({ board, difficulty }: { board: Board | null; difficulty: Difficulty }) {
  const [view, setView] = useState<Difficulty>(difficulty);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 난이도를 바꾸면 그 난이도 랭킹을 보여 줍니다.
    setView(difficulty);
  }, [difficulty]);
  const data = board?.[kindOf(view)] ?? { top: [], best: null };
  return (
    <section data-rank={view} aria-label="팟 계산 랭킹" className="grid gap-2 rounded-2xl border-2 border-amber-400/50 bg-zinc-950 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-black">🏆 팟 계산 랭킹</h2>
        <div className="ml-auto flex rounded-full border border-white/20 p-0.5">
          {DIFFICULTIES.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setView(d)}
              className={cn("min-h-9 rounded-full px-3 text-xs font-black", view === d ? "bg-amber-400 text-black" : "text-zinc-300")}
            >
              {DIFFICULTY[d].label}
            </button>
          ))}
        </div>
      </div>
      {!board ? <p className="text-sm text-zinc-400">불러오는 중…</p> : null}
      {board ? (
        data.best ? (
          <p className="text-sm font-bold text-amber-300">
            내 최고: {data.best.correct}/{ROUND_SIZE} · {secText(data.best.durationMs)}
          </p>
        ) : (
          <p className="text-sm text-zinc-400">아직 내 기록이 없습니다.</p>
        )
      ) : null}
      <ol className="grid gap-1">
        {Array.from({ length: 10 }, (_, i) => {
          const row = data.top[i];
          return (
            <li key={i} className={cn("flex min-h-9 items-center gap-2 rounded-lg px-2 py-1.5 text-sm", row?.mine ? "bg-amber-950 ring-1 ring-amber-400" : "bg-black")}>
              <span className={cn("w-7 text-center font-black", i === 0 ? "text-amber-300" : i === 1 ? "text-zinc-200" : i === 2 ? "text-orange-300" : "text-zinc-500")}>
                {i < 3 ? ["🥇", "🥈", "🥉"][i] : i + 1}
              </span>
              <span className={cn("min-w-0 flex-1 truncate font-bold", !row && "text-zinc-600")}>{row ? row.nickname : "—"}</span>
              {row ? (
                <>
                  <span className="font-black tabular-nums">
                    {row.correct}/{ROUND_SIZE}
                  </span>
                  <span className="w-20 text-right text-xs tabular-nums text-zinc-400">{secText(row.durationMs)}</span>
                </>
              ) : null}
            </li>
          );
        })}
      </ol>
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
