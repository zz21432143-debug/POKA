"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "cn";

const field = "w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-zinc-500";

/** 회원 문제 제안: 운영자가 골라서 오늘의 퀴즈로 냄 · 채택되면 +50P */
export function QuizSuggestForm({ loggedIn }: { loggedIn: boolean }) {
  const [question, setQuestion] = useState("");
  const [choices, setChoices] = useState(["", "", "", ""]);
  const [answer, setAnswer] = useState(0);
  const [explanation, setExplanation] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function submit() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/quiz/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, choices: choices.map((c) => c.trim()).filter(Boolean), answer, explanation }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "보내지 못했어요.");
      setQuestion("");
      setChoices(["", "", "", ""]);
      setAnswer(0);
      setExplanation("");
      setMsg({ ok: true, text: "문제를 보냈어요! 채택되면 +50P를 드려요." });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "보내지 못했어요." });
    } finally {
      setBusy(false);
    }
  }

  const filled = choices.map((c) => c.trim()).filter(Boolean).length;
  return (
    <details data-quiz-suggest className="ink-panel group rounded-2xl p-4">
      <summary className="flex min-h-10 cursor-pointer list-none items-center gap-2 [&::-webkit-details-marker]:hidden">
        <span className="text-base font-black text-[#f3d9a4]">✍️ 내가 문제 내기</span>
        <span className="text-xs text-zinc-400">채택되면 +50P · 오늘의 퀴즈로 나가요</span>
        <span className="ml-auto text-xs font-bold text-[#c9a25c] group-open:hidden">펼치기</span>
      </summary>
      {loggedIn ? (
        <form
          className="mt-3 grid gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <textarea value={question} onChange={(e) => setQuestion(e.target.value)} maxLength={200} rows={2} required className={field} placeholder="문제 (예: 9인 테이블 BTN 10bb, A5s는 올인? 폴드?)" />
          <fieldset className="grid gap-2 text-sm">
            <legend className="mb-1 text-xs text-zinc-400">보기 2~4개 · 정답 보기 왼쪽 동그라미를 눌러 주세요</legend>
            {choices.map((c, i) => (
              <div key={i} className="flex items-center gap-2">
                <input type="radio" name="suggest-answer" aria-label={`${i + 1}번이 정답`} checked={answer === i} onChange={() => setAnswer(i)} className="size-5 shrink-0" />
                <input value={c} maxLength={60} onChange={(e) => setChoices((list) => list.map((v, j) => (j === i ? e.target.value : v)))} className={field} placeholder={`보기 ${i + 1}${i >= 2 ? " (선택)" : ""}`} />
              </div>
            ))}
          </fieldset>
          <textarea value={explanation} onChange={(e) => setExplanation(e.target.value)} maxLength={600} rows={3} required className={field} placeholder="해설 (왜 그게 정답인지)" />
          <div className="flex flex-wrap items-center gap-2">
            <button type="submit" disabled={busy || filled < 2 || !choices[answer]?.trim()} className="min-h-11 rounded-xl bg-[#c9a25c] px-4 text-sm font-black text-black disabled:opacity-50">
              {busy ? "보내는 중…" : "문제 보내기"}
            </button>
            {msg ? <p className={cn("text-sm font-bold", msg.ok ? "text-emerald-300" : "text-rose-300")}>{msg.text}</p> : null}
          </div>
        </form>
      ) : (
        <p className="mt-3 text-sm text-zinc-300">
          <Link href="/login?next=%2Fquiz" className="font-bold text-[#e7c98a] underline">
            로그인
          </Link>
          하면 문제를 낼 수 있어요.
        </p>
      )}
    </details>
  );
}
