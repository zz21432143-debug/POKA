import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { prisma } from "@/lib/db";
import { todayKstDate, shiftDate } from "@/lib/dates";
import { generateQuiz, type QuizData, type QuizKind } from "@/lib/quiz";
import handRanking from "@/lib/data/hand-ranking.json";

/** 맞히면 포인트 · 연속 STREAK_DAYS일 맞히면 보너스 */
export const QUIZ_POINTS = 10;
export const STREAK_DAYS = 7;
export const STREAK_BONUS = 30;

export type QuizPublic = { id: string; day: string; kind: QuizKind; question: string; choices: string[] };
export type QuizFull = QuizPublic & { answer: number; explanation: string; source: string };
export type QuizStats = { counts: number[]; total: number };
export type QuizResult = {
  correct: boolean;
  choice: number;
  answer: number;
  explanation: string;
  stats: QuizStats;
  /** 이번에 받은 포인트(맞힘 + 연속 보너스) · 로그인 안 했으면 0 */
  gained: number;
  /** 연속으로 맞힌 날 수(오늘 포함) */
  streak: number;
  saved: boolean;
};

let dataCache: QuizData | null = null;
async function loadData(): Promise<QuizData> {
  if (dataCache) return dataCache;
  const read = async (p: string) => JSON.parse(await readFile(join(process.cwd(), "public", "data", p), "utf8"));
  const [positions, eq] = await Promise.all([read("gto-positions.json"), read("preflop-eq.json")]);
  dataCache = { positions, eq, ranking: handRanking as QuizData["ranking"] };
  return dataCache;
}

function toFull(row: { id: string; day: string; kind: string; question: string; choicesJson: string; answer: number; explanation: string; source: string }): QuizFull {
  return { id: row.id, day: row.day, kind: row.kind as QuizKind, question: row.question, choices: JSON.parse(row.choicesJson) as string[], answer: row.answer, explanation: row.explanation, source: row.source };
}
export const toPublic = (q: QuizFull): QuizPublic => ({ id: q.id, day: q.day, kind: q.kind, question: q.question, choices: q.choices });

/** 그날 퀴즈(없으면 자동으로 만들어 저장 · 오늘 이후 날짜는 만들지 않음) */
export async function getQuiz(day = todayKstDate()): Promise<QuizFull | null> {
  const found = await prisma.dailyQuiz.findUnique({ where: { day } });
  if (found) return toFull(found);
  if (day > todayKstDate()) return null;
  const draft = generateQuiz(day, await loadData());
  // 여러 요청이 동시에 와도 하루 한 문제(먼저 저장된 것을 씀)
  await prisma.dailyQuiz
    .createMany({ data: [{ day, kind: draft.kind, question: draft.question, choicesJson: JSON.stringify(draft.choices), answer: draft.answer, explanation: draft.explanation, source: "auto" }], skipDuplicates: true })
    .catch(() => undefined);
  const row = await prisma.dailyQuiz.findUnique({ where: { day } });
  return row ? toFull(row) : null;
}

export async function quizStats(quizId: string, choices: number): Promise<QuizStats> {
  const rows = await prisma.quizAnswer.groupBy({ by: ["choice"], where: { quizId }, _count: { _all: true } }).catch(() => []);
  const counts = Array.from({ length: choices }, (_, i) => rows.find((r) => r.choice === i)?._count._all ?? 0);
  return { counts, total: counts.reduce((a, b) => a + b, 0) };
}

/** 연속으로 맞힌 날 수: 오늘(또는 어제)부터 거꾸로 하루도 안 빠지고 그날 맞힌 날(지난 문제를 나중에 푼 건 안 침) */
export async function quizStreak(userId: string): Promise<number> {
  const rows = await prisma.$queryRaw<{ day: string }[]>`
    SELECT q.day FROM "QuizAnswer" a JOIN "DailyQuiz" q ON q.id = a."quizId"
    WHERE a."userId" = ${userId} AND a.correct = true
      AND to_char(a."createdAt" + interval '9 hours', 'YYYY-MM-DD') = q.day
    ORDER BY q.day DESC LIMIT 400
  `.catch(() => [] as { day: string }[]);
  const days = new Set(rows.map((r) => r.day));
  let day = todayKstDate();
  if (!days.has(day)) day = shiftDate(day, -1);
  let streak = 0;
  while (days.has(day)) {
    streak += 1;
    day = shiftDate(day, -1);
  }
  return streak;
}

/** 내가 이미 고른 답(없으면 null) */
export async function myAnswer(quizId: string, userId: string) {
  return prisma.quizAnswer.findUnique({ where: { quizId_userId: { quizId, userId } }, select: { choice: true, correct: true } }).catch(() => null);
}

/**
 * 답하기: 로그인 회원은 한 번만 기록 · 맞히면 포인트(연속 7일마다 보너스).
 * 비로그인은 기록 없이 정답만 보여 줌. 오늘 문제가 아닌 지난 문제는 포인트 없음.
 */
export async function answerQuiz(quizId: string, choice: number, userId: string | null): Promise<QuizResult | null> {
  const row = await prisma.dailyQuiz.findUnique({ where: { id: quizId } });
  if (!row) return null;
  const quiz = toFull(row);
  if (!Number.isInteger(choice) || choice < 0 || choice >= quiz.choices.length) return null;
  const correct = choice === quiz.answer;
  let gained = 0;
  let saved = false;
  let finalChoice = choice;
  if (userId) {
    const before = await myAnswer(quiz.id, userId);
    if (before) {
      // 이미 답했으면 처음 고른 답 그대로
      finalChoice = before.choice;
    } else {
      const created = await prisma.quizAnswer
        .createMany({ data: [{ quizId: quiz.id, userId, choice, correct }], skipDuplicates: true })
        .catch(() => ({ count: 0 }));
      saved = created.count === 1;
      if (saved && correct && quiz.day === todayKstDate()) {
        const streakNow = await quizStreak(userId);
        gained = QUIZ_POINTS + (streakNow > 0 && streakNow % STREAK_DAYS === 0 ? STREAK_BONUS : 0);
        await prisma.user.update({ where: { id: userId }, data: { points: { increment: gained } } }).catch(() => undefined);
        const { recordPointGain } = await import("@/lib/point-ledger");
        await recordPointGain(userId, gained, "quiz").catch(() => undefined);
      }
    }
  }
  const [stats, streak] = await Promise.all([quizStats(quiz.id, quiz.choices.length), userId ? quizStreak(userId) : Promise.resolve(0)]);
  return { correct: finalChoice === quiz.answer, choice: finalChoice, answer: quiz.answer, explanation: quiz.explanation, stats, gained, streak, saved };
}

/** 지난 퀴즈 목록(최근 것부터, 오늘 포함) */
export async function recentQuizzes(take = 30) {
  return prisma.dailyQuiz
    .findMany({ where: { day: { lte: todayKstDate() } }, orderBy: { day: "desc" }, take, select: { id: true, day: true, kind: true, question: true } })
    .catch(() => []);
}
