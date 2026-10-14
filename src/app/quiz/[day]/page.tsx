import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { BOARD_STICKER, BoardTitle } from "@/components/brand/oni";
import { QuizCard } from "@/components/quiz/quiz-card";
import { StudyAd } from "@/components/ads/board-bottom-ad";
import { getQuiz } from "@/lib/quiz-server";
import { quizInitial } from "@/lib/quiz-view";
import { todayKstDate } from "@/lib/dates";
import { KIND_LABEL, type QuizKind } from "@/lib/quiz";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const validDay = (day: string) => /^\d{4}-\d{2}-\d{2}$/.test(day);

export async function generateMetadata({ params }: { params: Promise<{ day: string }> }): Promise<Metadata> {
  const { day } = await params;
  const row = validDay(day) ? await prisma.dailyQuiz.findUnique({ where: { day }, select: { question: true, kind: true } }).catch(() => null) : null;
  if (!row) return { title: "홀덤 퀴즈" };
  return {
    title: `홀덤 퀴즈 ${day} — ${row.question}`.slice(0, 70),
    description: `${KIND_LABEL[row.kind as QuizKind] ?? ""} 퀴즈 · 정답과 해설, 다른 사람 선택 비율. POKA 오늘의 퀴즈.`,
    alternates: { canonical: `/quiz/${day}` },
  };
}

/** 지난 퀴즈: 풀어 보고 정답 · 해설(지난 문제는 포인트 없음). 오늘 문제면 /quiz로 */
export default async function QuizDayPage({ params }: { params: Promise<{ day: string }> }) {
  const { day } = await params;
  if (!validDay(day)) notFound();
  const today = todayKstDate();
  if (day === today) redirect("/quiz");
  if (day > today) notFound();
  // 지난 날짜는 이미 만들어진 문제만(새로 만들지 않음)
  const exists = await prisma.dailyQuiz.findUnique({ where: { day }, select: { id: true } }).catch(() => null);
  if (!exists) notFound();
  const quiz = await getQuiz(day);
  if (!quiz) notFound();
  const initial = await quizInitial(quiz);
  return (
    <div className="flex flex-col gap-4">
      <header className="board-intro">
        <Link href="/quiz" className="inline-flex min-h-10 items-center text-xs font-bold text-[#c9a25c]">
          ← 오늘의 퀴즈
        </Link>
        <BoardTitle sticker={BOARD_STICKER.study}>지난 퀴즈 · {day.replace(/-/g, ".")}</BoardTitle>
        <p className="mt-2">지난 문제도 풀어 볼 수 있어요(포인트는 그날 문제만).</p>
      </header>
      <QuizCard quiz={initial.quiz} initialResult={initial.result} loggedIn={initial.loggedIn} />
      {/* 검색으로 들어온 사람도 볼 수 있게 정답 · 해설은 접어서 */}
      <details data-quiz-answer className="ink-panel rounded-2xl p-4 text-sm">
        <summary className="min-h-10 cursor-pointer font-bold text-[#e7c98a]">정답 · 해설 바로 보기</summary>
        <p className="mt-2 font-black text-white">정답: {quiz.choices[quiz.answer]}</p>
        <p className="mt-1 leading-6 text-[#ece4d6]">{quiz.explanation}</p>
      </details>
      <StudyAd />
    </div>
  );
}
