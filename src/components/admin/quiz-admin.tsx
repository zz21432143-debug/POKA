"use client";

import { useEffect, useState } from "react";
import { cn } from "cn";
import { KIND_LABEL, type QuizKind } from "@/lib/quiz";

type Row = { id: string; day: string; kind: string; question: string; choices: string[]; answer: number; explanation: string; source: string; answers: number };
type Suggestion = { id: string; nickname: string; question: string; choices: string[]; answer: number; explanation: string; createdAt: string };

const field = "w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white";

/** 관리자: 날짜별 퀴즈 목록 + 직접 문제 넣기/지우기 */
export function QuizAdmin() {
  const [today, setToday] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [day, setDay] = useState("");
  const [question, setQuestion] = useState("");
  const [choices, setChoices] = useState(["", "", "", ""]);
  const [answer, setAnswer] = useState(0);
  const [explanation, setExplanation] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);

  useEffect(() => {
    let alive = true;
    fetch("/api/admin/quiz", { cache: "no-store" })
      .then(async (res) => {
        const json = (await res.json()) as { today?: string; rows?: Row[]; suggestions?: Suggestion[]; error?: string };
        if (!alive) return;
        if (!res.ok) return setMsg({ ok: false, text: json.error ?? "불러오지 못했어요." });
        setToday(json.today ?? "");
        setDay((d) => d || json.today || "");
        setRows(json.rows ?? []);
        setSuggestions(json.suggestions ?? []);
      })
      .catch(() => alive && setMsg({ ok: false, text: "불러오지 못했어요." }));
    return () => {
      alive = false;
    };
  }, []);

  async function send(method: "POST" | "DELETE", targetDay: string) {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(method === "DELETE" ? `/api/admin/quiz?day=${targetDay}` : "/api/admin/quiz", {
        method,
        headers: { "Content-Type": "application/json" },
        body: method === "POST" ? JSON.stringify({ day: targetDay, question, choices: choices.map((c) => c.trim()).filter(Boolean), answer, explanation }) : undefined,
      });
      const json = (await res.json()) as { rows?: Row[]; error?: string };
      if (!res.ok) throw new Error(json.error ?? "저장하지 못했어요.");
      setRows(json.rows ?? []);
      setMsg({ ok: true, text: method === "POST" ? `${targetDay} 문제를 저장했어요.` : `${targetDay} 문제를 지웠어요(그날 자동 문제가 나가요).` });
      if (method === "POST") {
        setQuestion("");
        setChoices(["", "", "", ""]);
        setAnswer(0);
        setExplanation("");
      }
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "저장하지 못했어요." });
    } finally {
      setBusy(false);
    }
  }

  /** 채택: 포인트를 주고 문제를 위 입력칸에 채움(날짜 골라 저장) · 거절 */
  async function decide(s: Suggestion, action: "adopt" | "reject") {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/quiz", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: s.id, action }) });
      const json = (await res.json()) as { suggestions?: Suggestion[]; error?: string };
      if (!res.ok) throw new Error(json.error ?? "처리하지 못했어요.");
      setSuggestions(json.suggestions ?? []);
      if (action === "adopt") {
        setQuestion(s.question);
        setChoices([...s.choices, "", "", "", ""].slice(0, 4));
        setAnswer(s.answer);
        setExplanation(s.explanation);
        setMsg({ ok: true, text: `${s.nickname}님 문제를 채택했어요(+50P). 날짜를 골라 저장하세요.` });
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else setMsg({ ok: true, text: "제안을 거절했어요." });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "처리하지 못했어요." });
    } finally {
      setBusy(false);
    }
  }

  function edit(row: Row) {
    setDay(row.day);
    setQuestion(row.question);
    setChoices([...row.choices, "", "", "", ""].slice(0, 4));
    setAnswer(row.answer);
    setExplanation(row.explanation);
    setMsg(null);
  }

  const filled = choices.map((c) => c.trim()).filter(Boolean).length;
  return (
    <div className="grid gap-4">
      <form
        data-quiz-admin-form
        className="grid gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4"
        onSubmit={(e) => {
          e.preventDefault();
          void send("POST", day);
        }}
      >
        <h2 className="text-base font-bold">직접 문제 넣기</h2>
        <label className="grid gap-1 text-sm">
          날짜
          <input type="date" value={day} min={today} onChange={(e) => setDay(e.target.value)} className={cn(field, "max-w-48")} required />
        </label>
        <label className="grid gap-1 text-sm">
          문제
          <textarea value={question} onChange={(e) => setQuestion(e.target.value)} maxLength={200} rows={2} className={field} required placeholder="예) 9max BTN 10bb, A5s는 올인? 폴드?" />
        </label>
        <fieldset className="grid gap-2 text-sm">
          <legend className="mb-1">보기(2~4개) · 정답에 체크</legend>
          {choices.map((c, i) => (
            <div key={i} className="flex items-center gap-2">
              <input type="radio" name="answer" aria-label={`${i + 1}번이 정답`} checked={answer === i} onChange={() => setAnswer(i)} className="size-5" />
              <input
                value={c}
                maxLength={60}
                onChange={(e) => setChoices((list) => list.map((v, j) => (j === i ? e.target.value : v)))}
                className={field}
                placeholder={`보기 ${i + 1}${i >= 2 ? " (선택)" : ""}`}
              />
            </div>
          ))}
        </fieldset>
        <label className="grid gap-1 text-sm">
          해설
          <textarea value={explanation} onChange={(e) => setExplanation(e.target.value)} maxLength={600} rows={3} className={field} required />
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <button type="submit" disabled={busy || filled < 2 || !choices[answer]?.trim()} className="min-h-10 rounded-lg bg-[#c9a25c] px-4 text-sm font-bold text-black disabled:opacity-50">
            저장
          </button>
          {msg ? <p className={cn("text-sm font-bold", msg.ok ? "text-emerald-300" : "text-rose-300")}>{msg.text}</p> : null}
        </div>
      </form>

      <section className="grid gap-2" data-quiz-suggestions>
        <h2 className="text-base font-bold">회원이 낸 문제 {suggestions.length ? `(${suggestions.length})` : ""}</h2>
        {suggestions.length ? (
          <ul className="grid gap-2">
            {suggestions.map((s) => (
              <li key={s.id} className="grid gap-1 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold">{s.nickname}</span>
                  <span className="text-xs text-muted-foreground">{s.createdAt.slice(0, 10)}</span>
                  <span className="ml-auto flex gap-1">
                    <button type="button" disabled={busy} onClick={() => void decide(s, "adopt")} className="min-h-9 rounded-lg bg-[#c9a25c] px-3 text-xs font-bold text-black">
                      채택(+50P)
                    </button>
                    <button type="button" disabled={busy} onClick={() => void decide(s, "reject")} className="min-h-9 rounded-lg border border-white/20 px-3 text-xs">
                      거절
                    </button>
                  </span>
                </div>
                <p className="font-semibold">{s.question}</p>
                <p className="text-xs text-muted-foreground">{s.choices.map((c, i) => (i === s.answer ? `✅${c}` : c)).join(" · ")}</p>
                <p className="text-xs text-muted-foreground">해설: {s.explanation}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">기다리는 제안이 없어요.</p>
        )}
      </section>

      <section className="grid gap-2" data-quiz-admin-list>
        <h2 className="text-base font-bold">최근 · 예약된 문제</h2>
        {rows.length ? (
          <ul className="grid gap-2">
            {rows.map((r) => (
              <li key={r.id} className="grid gap-1 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold tabular-nums">{r.day}</span>
                  {r.day === today ? <span className="rounded-full bg-[#7a1c22] px-2 text-[11px] font-bold">오늘</span> : r.day > today ? <span className="rounded-full bg-sky-900 px-2 text-[11px] font-bold">예약</span> : null}
                  <span className="rounded-full border border-white/20 px-2 text-[11px]">{KIND_LABEL[r.kind as QuizKind] ?? r.kind}</span>
                  <span className="text-xs text-muted-foreground">{r.source === "admin" ? "직접 넣음" : "자동"} · {r.answers}명 답함</span>
                  {r.day >= today && r.answers === 0 ? (
                    <span className="ml-auto flex gap-1">
                      <button type="button" onClick={() => edit(r)} className="min-h-9 rounded-lg border border-white/20 px-3 text-xs">
                        고치기
                      </button>
                      {r.source === "admin" ? (
                        <button type="button" disabled={busy} onClick={() => void send("DELETE", r.day)} className="min-h-9 rounded-lg border border-rose-400/50 px-3 text-xs text-rose-200">
                          지우기
                        </button>
                      ) : null}
                    </span>
                  ) : null}
                </div>
                <p className="font-semibold">{r.question}</p>
                <p className="text-xs text-muted-foreground">
                  {r.choices.map((c, i) => (i === r.answer ? `✅${c}` : c)).join(" · ")}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">아직 문제가 없어요.</p>
        )}
      </section>
    </div>
  );
}
