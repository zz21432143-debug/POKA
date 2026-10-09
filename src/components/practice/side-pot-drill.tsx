"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DrillResult } from "@/components/practice/drill-result";
import { gradeSidePot, makeSidePotQuestion, type SidePotQuestion } from "@/lib/dealer-pots";
import { formatChip } from "@/lib/practice-format";

const TOTAL = 10;

function FeltTable({ question }: { question: SidePotQuestion }) {
  return (
    <div className="relative mx-auto w-full max-w-md overflow-hidden rounded-[2.5rem] border border-emerald-900/40 bg-[#0d2a1c] px-4 py-8 text-emerald-50 shadow-inner">
      <div className="pointer-events-none absolute inset-3 rounded-[2rem] border border-emerald-400/20" />
      <p className="mb-4 text-center text-[11px] tracking-widest text-emerald-200/80">ALL-IN · SIDE POT</p>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-2">
        {question.players.map((row) => (
          <li
            key={row.seat}
            className="flex items-center justify-between rounded-xl bg-black/25 px-3 py-2 ring-1 ring-emerald-300/15"
          >
            <span className="text-xs font-semibold text-emerald-100">{row.seat}</span>
            <span className="font-mono text-sm tabular-nums">{formatChip(row.stack)}</span>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-center text-[11px] text-emerald-200/70">전원 올인. 혼자 남은 초과 칩은 팟이 아닙니다.</p>
    </div>
  );
}

export function SidePotDrill() {
  const [phase, setPhase] = useState<"intro" | "play" | "done">("intro");
  const [index, setIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [startedAt, setStartedAt] = useState(0);
  const [durationMs, setDurationMs] = useState(0);
  const [question, setQuestion] = useState<SidePotQuestion | null>(null);
  const [answers, setAnswers] = useState<string[]>([]);
  const [revealed, setRevealed] = useState<boolean | null>(null);

  const pots = question?.pots ?? [];
  const parsed = useMemo(() => answers.map((value) => Number(value)), [answers]);

  function start() {
    const next = makeSidePotQuestion();
    setQuestion(next);
    setAnswers(next.pots.map(() => ""));
    setRevealed(null);
    setIndex(0);
    setCorrectCount(0);
    setStartedAt(Date.now());
    setPhase("play");
  }

  function grade() {
    if (!question || revealed !== null) return;
    const ok = gradeSidePot(question.pots, parsed);
    setRevealed(ok);
    if (ok) setCorrectCount((n) => n + 1);
  }

  function next() {
    if (revealed === null) return;
    if (index + 1 >= TOTAL) {
      setDurationMs(Date.now() - startedAt);
      setPhase("done");
      return;
    }
    const q = makeSidePotQuestion();
    setQuestion(q);
    setAnswers(q.pots.map(() => ""));
    setRevealed(null);
    setIndex((n) => n + 1);
  }

  if (phase === "intro") {
    return (
      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h2 className="text-lg font-semibold">사이드팟 계산</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          전원 올인입니다. 짧은 스택부터 층을 나누고, 그 층에 칩을 넣을 수 있는 자리가 2명 이상일 때만
          팟이 생깁니다. 10문제를 풀면 기록이 남습니다.
        </p>
        <Button type="button" size="lg" onClick={start}>
          10문제 시작
        </Button>
      </div>
    );
  }

  if (phase === "done") {
    return (
      <DrillResult
        kind="SIDE_POT"
        title="사이드팟 계산"
        correct={correctCount}
        total={TOTAL}
        durationMs={durationMs}
        onReplay={start}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">
          {index + 1} / {TOTAL}
        </span>
        <span className="text-muted-foreground">맞힌 수 {correctCount}</span>
      </div>
      {question ? <FeltTable question={question} /> : null}
      <form
        className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm"
        onSubmit={(event) => {
          event.preventDefault();
          if (revealed === null) grade();
          else next();
        }}
      >
        {pots.map((pot, i) => (
          <label key={pot.name} className="flex flex-col gap-1 text-sm">
            <span className="font-medium">
              {pot.name}
              {revealed !== null ? (
                <span className="ml-2 font-normal text-muted-foreground">
                  참가 {pot.seats.join(", ")} · 정답 {formatChip(pot.amount)}
                </span>
              ) : null}
            </span>
            <Input
              inputMode="numeric"
              className="h-11 text-base tabular-nums"
              placeholder="금액"
              value={answers[i] ?? ""}
              disabled={revealed !== null}
              onChange={(event) => {
                const nextAnswers = [...answers];
                nextAnswers[i] = event.target.value.replace(/[^\d]/g, "");
                setAnswers(nextAnswers);
              }}
            />
          </label>
        ))}
        {revealed === true ? <p className="text-sm text-emerald-800">맞았습니다.</p> : null}
        {revealed === false ? <p className="text-sm text-destructive">금액이 다릅니다. 정답을 확인하세요.</p> : null}
        <Button type="submit" size="lg">
          {revealed === null ? "채점" : index + 1 >= TOTAL ? "결과" : "다음 문제"}
        </Button>
      </form>
    </div>
  );
}
