"use client";

import { useState } from "react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { formatDurationMs } from "@/lib/practice-format";
import { cn } from "cn";

type SaveState = "idle" | "saving" | "saved" | "guest" | "error";

export function DrillResult({
  kind,
  title,
  correct,
  total,
  durationMs,
  onReplay,
}: {
  kind: "SIDE_POT" | "MIN_RAISE";
  title: string;
  correct: number;
  total: number;
  durationMs: number;
  onReplay: () => void;
}) {
  const [state, setState] = useState<SaveState>("idle");
  const [reward, setReward] = useState<{ exp: number; points: number } | null>(null);

  async function save() {
    setState("saving");
    const res = await fetch("/api/practice/runs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, correct, total, durationMs }),
    });
    if (res.status === 401) {
      setState("guest");
      return;
    }
    const data = (await res.json().catch(() => null)) as
      | { saved?: boolean; exp?: number; points?: number }
      | null;
    if (!res.ok || !data?.saved) {
      setState("error");
      return;
    }
    setReward({ exp: data.exp ?? 0, points: data.points ?? 0 });
    setState("saved");
  }

  const perfect = correct === total;
  const pass = correct >= 7;

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border bg-white p-5 shadow-sm">
      <p className="text-sm text-muted-foreground">{title} 10문제</p>
      <p className="text-3xl font-semibold tracking-tight">
        {correct}
        <span className="text-lg text-muted-foreground"> / {total}</span>
      </p>
      <p className="text-sm text-muted-foreground">소요 {formatDurationMs(durationMs)}</p>
      <p className="text-sm">
        {perfect
          ? "만점입니다. 테이블에서 바로 쓸 수 있는 속도입니다."
          : pass
            ? "실전 기준은 통과입니다. 틀린 유형만 한 번 더 보면 됩니다."
            : "규칙만 다시 잡고 한 판 더 돌려 보세요."}
      </p>
      {state === "idle" ? (
        <Button type="button" size="lg" onClick={() => void save()}>
          기록 저장
        </Button>
      ) : null}
      {state === "saving" ? <p className="text-sm text-muted-foreground">저장 중…</p> : null}
      {state === "saved" ? (
        <p className="text-sm text-emerald-800">
          순위표에 올렸습니다
          {reward && (reward.exp > 0 || reward.points > 0)
            ? ` · EXP +${reward.exp} · 포인트 +${reward.points}`
            : " · 7문제 이상이면 보상이 들어갑니다"}
          .
        </p>
      ) : null}
      {state === "guest" ? (
        <p className="text-sm text-muted-foreground">
          비회원도 연습은 됩니다. 기록·순위를 남기려면{" "}
          <Link href="/login" className="font-medium text-primary underline">
            로그인
          </Link>
          하세요.
        </p>
      ) : null}
      {state === "error" ? <p className="text-sm text-destructive">저장에 실패했습니다. 다시 눌러 주세요.</p> : null}
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={onReplay}>
          다시 하기
        </Button>
        <Link href="/practice/ranks" className={cn(buttonVariants({ variant: "ghost" }))}>
          순위 보기
        </Link>
        <Link href="/practice" className={cn(buttonVariants({ variant: "ghost" }))}>
          연습 허브
        </Link>
      </div>
    </div>
  );
}
