import { QuizCard } from "@/components/quiz/quiz-card";
import { getQuiz } from "@/lib/quiz-server";
import { quizInitial } from "@/lib/quiz-view";

/** 홈: 오늘의 퀴즈(납작하게 펼쳐 둠 — 처음 온 사람도 바로 한 번 누르게). 문제를 못 만들면 아무것도 안 그림 */
export async function HomeQuiz() {
  const quiz = await getQuiz().catch(() => null);
  if (!quiz) return null;
  const initial = await quizInitial(quiz).catch(() => null);
  if (!initial) return null;
  return <QuizCard quiz={initial.quiz} initialResult={initial.result} loggedIn={initial.loggedIn} compact />;
}
