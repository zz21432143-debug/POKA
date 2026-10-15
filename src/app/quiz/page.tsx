import type { Metadata } from "next";
import Link from "next/link";
import { CrownIcon } from "lucide-react";
import { cn } from "cn";
import { BOARD_STICKER, BoardTitle } from "@/components/brand/oni";
import { QuizCard } from "@/components/quiz/quiz-card";
import { StudyAd } from "@/components/ads/board-bottom-ad";
import { getQuiz, recentQuizzes } from "@/lib/quiz-server";
import { quizInitial } from "@/lib/quiz-view";
import { KIND_LABEL, type QuizKind } from "@/lib/quiz";
import { getRanking } from "@/lib/ranking";
import { QuizAlertToggle } from "@/components/quiz/quiz-alert-toggle";
import { QuizSuggestForm } from "@/components/quiz/quiz-suggest-form";

const TITLE = "오늘의 홀덤 퀴즈 — 매일 한 문제 · 푸시폴드 · 승률 · 족보 · 레인지";
const DESCRIPTION = "매일 새로 나오는 홀덤 퀴즈. 하나만 고르면 정답과 해설, 다른 사람 선택 비율이 바로 나와요. 맞히면 포인트, 이번 달 1위는 「퀴즈 요괴」 칭호.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/quiz" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "/quiz" },
};
export const dynamic = "force-dynamic";

/** 오늘의 퀴즈: 오늘 문제 · 이번 달 퀴즈 랭킹 · 지난 문제(정답 · 해설) */
export default async function QuizPage() {
  const quiz = await getQuiz().catch(() => null);
  const [initial, ranking, past] = await Promise.all([
    quiz ? quizInitial(quiz) : Promise.resolve(null),
    getRanking("quiz", "month").catch(() => []),
    recentQuizzes(31),
  ]);
  const older = past.filter((q) => q.day !== quiz?.day);
  return (
    <div className="flex flex-col gap-4">
      <header className="board-intro">
        <BoardTitle sticker={BOARD_STICKER.study}>오늘의 퀴즈</BoardTitle>
        <p className="mt-2">매일 0시에 새 문제 · 하나만 고르면 정답과 해설이 바로 나와요. 맞히면 +10P, 7일 연속이면 보너스 +30P.</p>
      </header>

      {initial ? (
        <QuizCard quiz={initial.quiz} initialResult={initial.result} loggedIn={initial.loggedIn} />
      ) : (
        <p className="ink-panel rounded-2xl p-4 text-sm text-[#d1c7b5]">오늘 문제를 준비하고 있어요. 잠시 뒤 새로고침해 주세요.</p>
      )}

      <QuizAlertToggle />

      <StudyAd />

      <section aria-label="이번 달 퀴즈 랭킹" data-quiz-ranking className="ink-panel grid gap-2 rounded-2xl p-4">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-black text-[#f3d9a4]">이번 달 퀴즈 랭킹</h2>
          <span className="text-xs text-zinc-400">1위(3문제 이상)는 🧩 「퀴즈 요괴」 칭호</span>
          <Link href="/ranking?tab=quiz&period=month" className="tap-pad relative ml-auto text-xs font-bold text-[#c9a25c]">
            전체 ›
          </Link>
        </div>
        {ranking.length ? (
          <ol className="grid gap-1">
            {ranking.slice(0, 10).map((row) => (
              <li key={row.userId} className={cn("flex min-h-10 items-center gap-2 rounded-lg px-2", row.rank === 1 && "bg-[#c9a25c]/10")}>
                <span className="flex w-8 items-center gap-0.5 text-sm font-black tabular-nums text-white">
                  {row.rank <= 3 ? <CrownIcon aria-hidden className="size-3.5 text-[#f5d76e]" /> : null}
                  {row.rank}
                </span>
                <Link href={`/u/${encodeURIComponent(row.nickname)}`} className="flex min-h-10 min-w-0 flex-1 items-center truncate text-sm font-bold text-white">
                  {row.nickname}
                </Link>
                <span className="text-xs font-black text-[#e7c98a] tabular-nums">{row.score}문제</span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-zinc-400">이번 달 첫 정답자가 되어 보세요!</p>
        )}
      </section>

      {older.length ? (
        <section aria-label="지난 문제" data-quiz-past className="ink-panel grid gap-1 rounded-2xl p-4">
          <h2 className="text-base font-black text-[#f3d9a4]">지난 문제 · 정답과 해설</h2>
          <ul className="grid">
            {older.map((q) => (
              <li key={q.id}>
                <Link href={`/quiz/${q.day}`} className="flex min-h-11 items-center gap-2 border-b border-white/5 text-sm last:border-0 hover:text-[#e7c98a]">
                  <span className="shrink-0 text-xs text-zinc-400 tabular-nums">{q.day.slice(5).replace("-", ".")}</span>
                  <span className="shrink-0 rounded-full border border-[#c9a25c]/40 px-1.5 text-[10px] font-bold text-[#e7c98a]">{KIND_LABEL[q.kind as QuizKind] ?? q.kind}</span>
                  <span className="min-w-0 truncate text-[#E5E7EB]">{q.question}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <QuizSuggestForm loggedIn={Boolean(initial?.loggedIn)} />
    </div>
  );
}
