"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "cn";
import { KIND_LABEL } from "@/lib/quiz";
import type { QuizPublic, QuizResult } from "@/lib/quiz-server";

/**
 * 오늘의 퀴즈 카드: 보기를 누르면 바로 정답 · 해설 · 다른 사람 선택 비율.
 * 로그인하면 맞힐 때 포인트, 비로그인은 정답만 보여 줌(기록 안 함).
 * compact: 홈 등에서 작게(해설은 접어 둠)
 */
export function QuizCard({
  quiz,
  initialResult = null,
  loggedIn,
  compact = false,
}: {
  quiz: QuizPublic;
  initialResult?: QuizResult | null;
  loggedIn: boolean;
  compact?: boolean;
}) {
  const [result, setResult] = useState<QuizResult | null>(initialResult);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pick(choice: number) {
    if (busy || result) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/quiz", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ quizId: quiz.id, choice }) });
      const json = (await res.json()) as { result?: QuizResult; error?: string };
      if (!res.ok || !json.result) throw new Error(json.error ?? "답을 보내지 못했어요.");
      setResult(json.result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "답을 보내지 못했어요.");
    } finally {
      setBusy(false);
    }
  }

  const total = result?.stats.total ?? 0;
  return (
    <section aria-label="오늘의 퀴즈" data-quiz-card={quiz.day} className="lounge-card grid gap-3 rounded-[1.35rem] p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-[#7a1c22] px-2 py-0.5 text-[11px] font-black text-[#f6efe2]">🧩 오늘의 퀴즈</span>
        <span className="rounded-full border border-[#c9a25c]/50 px-2 py-0.5 text-[11px] font-bold text-[#e7c98a]">{KIND_LABEL[quiz.kind]}</span>
        <span className="text-xs text-zinc-400">{quiz.day.replace(/-/g, ".")}</span>
        {compact ? (
          <Link href="/quiz" className="ml-auto text-xs font-bold text-[#e7c98a]">
            퀴즈 랭킹 · 지난 문제 ›
          </Link>
        ) : null}
      </div>
      <h2 className={cn("font-black leading-snug text-white", compact ? "text-base" : "text-lg sm:text-xl")}>{quiz.question}</h2>
      <ul className={cn("grid gap-2", quiz.choices.length > 2 ? "sm:grid-cols-2" : "grid-cols-2")}>
        {quiz.choices.map((label, i) => {
          const picked = result?.choice === i;
          const right = result ? result.answer === i : false;
          const share = result && total ? Math.round((result.stats.counts[i] / total) * 100) : 0;
          return (
            <li key={label}>
              <button
                type="button"
                data-quiz-choice={i}
                disabled={busy || Boolean(result)}
                onClick={() => void pick(i)}
                className={cn(
                  "relative flex min-h-12 w-full items-center gap-2 overflow-hidden rounded-xl border px-3 text-left text-[15px] font-black transition",
                  !result && "border-[#c9a25c]/50 bg-black/40 text-white hover:border-[#c9a25c] hover:bg-[#2a2017] active:scale-[0.98]",
                  result && right && "border-emerald-400 bg-emerald-950/60 text-emerald-100",
                  result && !right && picked && "border-rose-400 bg-rose-950/60 text-rose-100",
                  result && !right && !picked && "border-white/10 bg-black/30 text-zinc-400",
                )}
              >
                {/* 답한 뒤: 다른 사람 선택 비율 막대 */}
                {result ? <span aria-hidden className="absolute inset-y-0 left-0 bg-white/[0.07]" style={{ width: `${share}%` }} /> : null}
                <span className="relative min-w-0 flex-1">{label}</span>
                {result ? (
                  <span className="relative shrink-0 text-xs font-bold tabular-nums">
                    {right ? "✅ " : picked ? "❌ " : ""}
                    {total ? `${share}%` : ""}
                  </span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>
      {error ? <p className="text-sm font-bold text-rose-300">{error}</p> : null}
      {result ? (
        <div data-quiz-result className="grid gap-1.5 rounded-xl bg-black/30 p-3">
          <p className={cn("text-base font-black", result.correct ? "text-emerald-300" : "text-rose-300")}>
            {result.correct ? "정답이에요! 🎉" : `아쉬워요 — 정답은 「${quiz.choices[result.answer]}」`}
            {result.gained > 0 ? <span className="ml-2 text-sm text-[#f5d76e]">+{result.gained}P</span> : null}
          </p>
          <p className="text-sm leading-6 text-[#ece4d6]">{result.explanation}</p>
          <p className="text-xs text-zinc-400">
            {total ? `회원 ${total.toLocaleString()}명이 풀었어요` : "아직 푼 회원이 없어요 — 첫 정답자가 되어 보세요"}
            {loggedIn && result.streak > 0 ? ` · 연속 정답 ${result.streak}일째(7일마다 보너스 +30P)` : ""}
          </p>
          {!loggedIn ? (
            <p className="text-xs text-[#e7c98a]">
              <Link href="/login?next=%2Fquiz" className="font-bold underline">
                로그인
              </Link>
              하면 맞힐 때마다 포인트 +10P · 연속 정답 보너스 · 퀴즈 랭킹에 올라가요.
            </p>
          ) : null}
        </div>
      ) : (
        <p className="text-xs text-zinc-400">하나를 고르면 바로 정답과 해설이 나와요. {loggedIn ? "맞히면 +10P!" : "로그인하면 맞힐 때 +10P."}</p>
      )}
    </section>
  );
}
