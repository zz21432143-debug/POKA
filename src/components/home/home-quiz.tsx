import { QuizCard } from "@/components/quiz/quiz-card";
import { MobileFold } from "@/components/home/mobile-fold";
import { getQuiz } from "@/lib/quiz-server";
import { quizInitial } from "@/lib/quiz-view";
import { KIND_LABEL } from "@/lib/quiz";

/** 홈: 오늘의 퀴즈(작게). 휴대폰에서는 제목 한 줄로 접어 둠. 문제를 못 만들면 아무것도 안 그림 */
export async function HomeQuiz() {
  const quiz = await getQuiz().catch(() => null);
  if (!quiz) return null;
  const initial = await quizInitial(quiz).catch(() => null);
  if (!initial) return null;
  const solved = Boolean(initial.result);
  return (
    <MobileFold
      data="quiz"
      title={
        <>
          🧩 오늘의 퀴즈 · {KIND_LABEL[initial.quiz.kind]}{" "}
          <span className={solved ? "text-emerald-300" : "text-[#f5d76e]"}>
            {solved
              ? initial.result?.correct
                ? "✅ 맞혔어요"
                : "풀었어요"
              : "맞히면 +10P"}
          </span>
        </>
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
