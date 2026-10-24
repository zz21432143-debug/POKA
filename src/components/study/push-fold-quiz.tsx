"use client";

import { useEffect, useState } from "react";
import Link from "@/components/ui/link";
import { PlayingCard } from "@/components/hand/playing-card";
import { answerOf, maxPushStack, pickSpot, type PosData, type QuizSpot } from "@/lib/pushfold-quiz";
import { cn } from "cn";

const SCORE_KEY = "poka-pf-quiz";

/** "K9o" → 카드 두 장(무늬는 보기용) */
function cardsOf(name: string) {
  const a = name[0];
  const b = name[1];
  if (name.length === 2) return [`${a}s`, `${b}h`];
  return name.endsWith("s") ? [`${a}s`, `${b}s`] : [`${a}s`, `${b}h`];
}

type Score = { right: number; total: number; streak: number; best: number };

function loadScore(): Score {
  try {
    const raw = window.localStorage.getItem(SCORE_KEY);
    const s = raw ? (JSON.parse(raw) as Partial<Score>) : {};
    return { right: s.right ?? 0, total: s.total ?? 0, streak: s.streak ?? 0, best: s.best ?? 0 };
  } catch {
    return { right: 0, total: 0, streak: 0, best: 0 };
  }
}

/** 푸시폴드 상황 연습: 모두 폴드하고 내 차례 · 이 스택 · 이 패면 올인? 폴드? (정답 = /info/push-fold 차트) */
export function PushFoldQuiz() {
  const [data, setData] = useState<PosData | null>(null);
  const [error, setError] = useState(false);
  const [spot, setSpot] = useState<QuizSpot | null>(null);
  const [picked, setPicked] = useState<"push" | "fold" | null>(null);
  const [score, setScore] = useState<Score>({ right: 0, total: 0, streak: 0, best: 0 });

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 점수는 이 기기에만 있음
    setScore(loadScore());
    let alive = true;
    fetch("/data/gto-positions.json")
      .then((r) => (r.ok ? (r.json() as Promise<PosData>) : Promise.reject(new Error("load"))))
      .then((d) => {
        if (!alive) return;
        setData(d);
        setSpot(pickSpot(d));
      })
      .catch(() => {
        if (alive) setError(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  if (error) return <p className="rounded-xl border border-rose-500/40 p-4 text-sm text-rose-200">문제를 불러오지 못했어요. 새로고침해 주세요.</p>;
  if (!data || !spot) return <p className="rounded-xl border border-white/10 p-4 text-sm text-[#d1c7b5]">문제를 준비하고 있어요…</p>;

  const name = data.names[spot.hand];
  const answer = answerOf(data, spot);
  const limit = maxPushStack(data, spot);
  const modeLabel = data.modes[spot.mode]?.label ?? "";
  const correct = picked != null && answer != null && (picked === "push") === answer.push;

  function choose(choice: "push" | "fold") {
    if (picked || !answer) return;
    setPicked(choice);
    const ok = (choice === "push") === answer.push;
    const next: Score = {
      right: score.right + (ok ? 1 : 0),
      total: score.total + 1,
      streak: ok ? score.streak + 1 : 0,
      best: Math.max(score.best, ok ? score.streak + 1 : 0),
    };
    setScore(next);
    try {
      window.localStorage.setItem(SCORE_KEY, JSON.stringify(next));
    } catch {
      /* 저장 못 해도 문제는 계속 */
    }
  }

  function nextSpot() {
    if (!data) return;
    setPicked(null);
    setSpot(pickSpot(data));
  }

  return (
    <div data-pf-quiz className="grid gap-3">
      <p className="flex flex-wrap gap-x-3 gap-y-1 text-sm font-bold text-[#d1c7b5]">
        <span>
          정답 <b className="text-white">{score.right}</b> / {score.total}
        </span>
        <span>
          연속 <b className="text-[#e7c98a]">{score.streak}</b>
        </span>
        <span>
          최고 연속 <b className="text-[#e7c98a]">{score.best}</b>
        </span>
      </p>
      <section className="grid gap-3 rounded-2xl border-2 border-[#c9a25c]/50 bg-[#1d1611] p-4">
        <p data-pf-spot className="text-base leading-7 text-[#f3eadb]">
          <b>{spot.size}인 토너먼트</b> · {modeLabel} · 앞에서 모두 폴드하고 <b className="text-[#e7c98a]">{spot.position}</b>인 내 차례.
          <br />
          모두 <b className="text-[#e7c98a]">{spot.stack}BB</b>(같은 스택 기준)
        </p>
        <div className="flex items-center gap-3">
          {cardsOf(name).map((code) => (
            <PlayingCard key={code} code={code} size="lg" />
          ))}
          <span className="text-2xl font-black text-white">{name}</span>
        </div>
        {picked ? null : (
          <div className="grid grid-cols-2 gap-2">
            <button type="button" data-pf-choose="push" onClick={() => choose("push")} className="min-h-14 rounded-xl bg-[#c9a25c] text-lg font-black text-[#1d1611]">
              올인
            </button>
            <button type="button" data-pf-choose="fold" onClick={() => choose("fold")} className="min-h-14 rounded-xl border-2 border-white/30 text-lg font-black text-white">
              폴드
            </button>
          </div>
        )}
        {picked && answer ? (
          <div data-pf-result className={cn("grid gap-2 rounded-xl p-3", correct ? "bg-emerald-950/60" : "bg-rose-950/60")}>
            <p className="text-lg font-black">{correct ? "⭕ 정답!" : "❌ 아쉬워요"} · 차트 정답: {answer.push ? "올인" : "폴드"}</p>
            <p className="text-sm leading-6 text-[#f3eadb]">
              이 자리 · {spot.stack}BB에서는 상위 약 {answer.pushPct}%를 올인해요.{" "}
              {limit > 0 ? (
                <>
                  {name}는 이 자리에서 <b>{limit >= 25 ? "25BB 넘게도" : `${limit}BB까지`}</b> 올인 범위예요.
                </>
              ) : (
                <>{name}는 2~25BB 어디서도 이 자리 올인 범위에 들지 않아요.</>
              )}
            </p>
            <p className="text-xs text-[#b8ab98]">차트는 뒤 사람들이 내시 균형으로 콜한다고 볼 때의 기준이에요. 상대가 너무 많이 · 적게 콜하면 조정하세요.</p>
            <button type="button" data-pf-next onClick={nextSpot} className="min-h-12 rounded-xl bg-white text-base font-black text-black">
              다음 문제 →
            </button>
          </div>
        ) : null}
      </section>
      <Link href="/info/push-fold" className="inline-flex min-h-11 items-center text-sm font-bold text-[#e7c98a] underline">
        전체 푸시폴드 차트 보기 →
      </Link>
    </div>
  );
}
