import { prisma } from "@/lib/db";
import { shiftDate, todayKstDate } from "@/lib/dates";

/** 비회원 퀴즈 풀이 수를 하루 단위로 세는 칸(TrafficDaily, 유입 경로 표에는 안 나옴 — "x-"로 시작) */
export const QUIZ_GUEST_SOURCE = "x-quiz-guest";

export type QuizDay = { day: string; guests: number; members: number; fresh: number };

/**
 * 최근 N일 퀴즈 풀이(한국 날짜): 비회원 · 회원 · 그날 가입한 회원 중 푼 사람.
 * 메인 퀴즈가 처음 온 사람을 붙잡는지 보는 숫자.
 */
export async function quizDailyStats(days = 14): Promise<QuizDay[]> {
  const today = todayKstDate();
  const from = shiftDate(today, -(days - 1));
  const since = new Date(`${from}T00:00:00+09:00`);
  const [memberRows, guestRows] = await Promise.all([
    prisma.$queryRaw<{ d: string; n: bigint; fresh: bigint }[]>`
      SELECT to_char(((a."createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Seoul'), 'YYYY-MM-DD') AS d,
             count(*) AS n,
             count(*) FILTER (WHERE to_char(((u."createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Seoul'), 'YYYY-MM-DD')
                                  = to_char(((a."createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Seoul'), 'YYYY-MM-DD')) AS fresh
      FROM "QuizAnswer" a JOIN "User" u ON u.id = a."userId"
      WHERE a."createdAt" >= ${since}
      GROUP BY 1`.catch(() => []),
    prisma.trafficDaily.findMany({ where: { source: QUIZ_GUEST_SOURCE, day: { gte: from } }, select: { day: true, visits: true } }).catch(() => []),
  ]);
  const out: QuizDay[] = [];
  for (let i = 0; i < days; i++) {
    const day = shiftDate(today, -i);
    const m = memberRows.find((r) => r.d === day);
    out.push({ day, guests: guestRows.find((r) => r.day === day)?.visits ?? 0, members: Number(m?.n ?? 0), fresh: Number(m?.fresh ?? 0) });
  }
  return out;
}
