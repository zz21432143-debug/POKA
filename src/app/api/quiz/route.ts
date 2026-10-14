import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { answerQuiz, getQuiz, myAnswer, quizStats, quizStreak, toPublicWithAuthor } from "@/lib/quiz-server";

export const dynamic = "force-dynamic";
const NO_STORE = { "Cache-Control": "no-store" };

/** 오늘(또는 ?day=) 퀴즈: 정답은 답한 뒤에만 */
export async function GET(request: Request) {
  const day = new URL(request.url).searchParams.get("day") ?? undefined;
  if (day && !/^\d{4}-\d{2}-\d{2}$/.test(day)) return NextResponse.json({ error: "날짜를 확인하세요." }, { status: 400 });
  const quiz = await getQuiz(day).catch(() => null);
  if (!quiz) return NextResponse.json({ quiz: null }, { headers: NO_STORE });
  const user = await getCurrentUser().catch(() => null);
  const mine = user ? await myAnswer(quiz.id, user.id) : null;
  if (!mine) return NextResponse.json({ quiz: await toPublicWithAuthor(quiz), loggedIn: Boolean(user) }, { headers: NO_STORE });
  const [stats, streak] = await Promise.all([quizStats(quiz.id, quiz.choices.length), quizStreak(user!.id)]);
  return NextResponse.json(
    {
      quiz: await toPublicWithAuthor(quiz),
      loggedIn: true,
      result: { correct: mine.correct, choice: mine.choice, answer: quiz.answer, explanation: quiz.explanation, stats, gained: 0, streak, saved: false },
    },
    { headers: NO_STORE },
  );
}

/** 답하기: { quizId, choice } → 정답 · 해설 · 다른 사람 선택 비율 · 받은 포인트 · 연속 정답 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { quizId?: unknown; choice?: unknown };
  const quizId = typeof body.quizId === "string" ? body.quizId : "";
  const choice = Number(body.choice);
  if (!quizId || !Number.isInteger(choice)) return NextResponse.json({ error: "답을 골라 주세요." }, { status: 400 });
  const user = await getCurrentUser().catch(() => null);
  const result = await answerQuiz(quizId, choice, user?.id ?? null).catch(() => null);
  if (!result) return NextResponse.json({ error: "퀴즈를 찾을 수 없어요." }, { status: 404 });
  return NextResponse.json({ result, loggedIn: Boolean(user) }, { headers: NO_STORE });
}
