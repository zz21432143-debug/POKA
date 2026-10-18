import { QuizCard } from "@/components/quiz/quiz-card";
import { MobileFold } from "@/components/home/mobile-fold";
import { getQuiz } from "@/lib/quiz-server";
import { quizInitial } from "@/lib/quiz-view";
import { KIND_LABEL, quizSlotName } from "@/lib/quiz";

/** 홈: 오늘의 퀴즈(작게). 제목 한 칸으로 접어 두고 누르면 펼침. 문제를 못 만들면 아무것도 안 그림 */
export async function HomeQuiz() {
  const quiz = await getQuiz().catch(() => null);
  if (!quiz) return null;
  const initial = await quizInitial(quiz).catch(() => null);
  if (!initial) return null;
  const solved = Boolean(initial.result);
  return (
    <MobileFold
      data="quiz"
      title={<>🧩 {quizSlotName(initial.quiz.day)} 퀴즈<span className="hidden sm:inline"> · {KIND_LABEL[initial.quiz.kind]}</span></>}
      sub={
        <span className={solved ? "text-emerald-300" : "text-[#f5d76e]"}>
          <span className="text-[#cfc3ad] sm:hidden">{KIND_LABEL[initial.quiz.kind]} · </span>
          {solved ? (initial.result?.correct ? "✅ 맞혔어요" : "풀었어요") : "맞히면 +13P"}
        </span>
      }
      hint={initial.quiz.question}
    >
      <QuizCard
        quiz={initial.quiz}
        initialResult={initial.result}
        loggedIn={initial.loggedIn}
        compact
      />
    </MobileFold>
  );
}
