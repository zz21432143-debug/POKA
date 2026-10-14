import { getCurrentUser } from "@/lib/current-user";
import { myAnswer, quizStats, quizStreak, toPublic, type QuizFull, type QuizResult } from "@/lib/quiz-server";

/** 화면에 처음 그릴 퀴즈 상태: 로그인 회원이 이미 답했으면 결과까지(정답은 답한 뒤에만) */
export async function quizInitial(quiz: QuizFull) {
  const user = await getCurrentUser().catch(() => null);
  const mine = user ? await myAnswer(quiz.id, user.id) : null;
  let result: QuizResult | null = null;
  if (user && mine) {
    const [stats, streak] = await Promise.all([quizStats(quiz.id, quiz.choices.length), quizStreak(user.id)]);
    result = { correct: mine.correct, choice: mine.choice, answer: quiz.answer, explanation: quiz.explanation, stats, gained: 0, streak, saved: false };
  }
  return { quiz: toPublic(quiz), result, loggedIn: Boolean(user), userId: user?.id ?? null };
}
