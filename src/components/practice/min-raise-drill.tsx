"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DrillResult } from "@/components/practice/drill-result";
import { makeMinRaiseQuestion, type MinRaiseQuestion } from "@/lib/dealer-raise";
import { formatChip } from "@/lib/practice-format";

const TOTAL = 10;

export function MinRaiseDrill() {
  const [phase, setPhase] = useState<"intro" | "play" | "done">("intro");
  const [index, setIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [startedAt, setStartedAt] = useState(0);
  const [durationMs, setDurationMs] = useState(0);
  const [question, setQuestion] = useState<MinRaiseQuestion | null>(null);
  const [value, setValue] = useState("");
  const [revealed, setRevealed] = useState<boolean | null>(null);

  function start() {
    setQuestion(makeMinRaiseQuestion());
    setValue("");
    setRevealed(null);
    setIndex(0);
    setCorrectCount(0);
    setStartedAt(Date.now());
    setPhase("play");
  }

  function grade() {
    if (!question || revealed !== null) return;
    const ok = Number(value) === question.answer;
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
    setQuestion(makeMinRaiseQuestion());
    setValue("");
    setRevealed(null);
    setIndex((n) => n + 1);
  }

  if (phase === "intro") {
    return (
      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-[#1a1617] p-5 shadow-sm">
        <h2 className="text-lg font-semibold">미니멈 레이즈</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          노리밋 홀덤 기준입니다. 미니멈 레이즈 총액 = 현재 벳 + 직전 풀 레이즈 폭. 불완전 올인은 이번
          세트에 넣지 않았습니다. 답은 총액으로 적습니다.
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
        kind="MIN_RAISE"
        title="미니멈 레이즈"
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
      <div className="rounded-[2rem] border border-emerald-900/40 bg-[#07150f] px-5 py-8 text-center text-emerald-50 shadow-inner">
        <p className="text-[11px] tracking-widest text-emerald-300/80">NL HOLD&apos;EM · MIN RAISE</p>
        <p className="mt-3 text-base leading-relaxed">{question?.prompt}</p>
        <p className="mt-2 text-lg font-semibold">{question?.detail}</p>
      </div>
      <form
        className="flex flex-col gap-3 rounded-2xl border border-border bg-[#1a1617] p-4 shadow-sm"
        onSubmit={(event) => {
          event.preventDefault();
          if (revealed === null) grade();
          else next();
        }}
      >
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">총액</span>
          <Input
            inputMode="numeric"
            className="h-11 text-base tabular-nums"
            placeholder="예: 500"
            value={value}
            disabled={revealed !== null}
            autoFocus
            onChange={(event) => setValue(event.target.value.replace(/[^\d]/g, ""))}
          />
        </label>
        {revealed === true ? <p className="text-sm text-emerald-300">맞았습니다.</p> : null}
        {revealed === false && question ? (
          <p className="text-sm text-destructive">정답은 {formatChip(question.answer)}입니다.</p>
        ) : null}
        <Button type="submit" size="lg">
          {revealed === null ? "채점" : index + 1 >= TOTAL ? "결과" : "다음 문제"}
        </Button>
      </form>
    </div>
  );
}
