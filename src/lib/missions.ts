import { prisma } from "@/lib/db";
import { todayKstDate, weekStartKst } from "@/lib/dates";
import { grantRewards } from "@/lib/exp";
import { DAILY_POINT_CAP } from "@/lib/rewards";

/** 오늘의 미션 5개를 다 하면 받는 보너스(하루 한 번 · 활동 한도와 별도) */
export const MISSION_REWARD = { points: 130, exp: 30 } as const;
/** 주간 미션: 이번 주(월~일)에 오늘의 미션 보너스를 WEEK_TARGET일 받으면 */
export const WEEK_TARGET = 5;
export const WEEK_REWARD = { points: 390, exp: 100 } as const;

export type MissionKey = "attend" | "quiz" | "post" | "comment" | "study";
export type MissionStatus = {
  items: { key: MissionKey; label: string; done: boolean; href: string }[];
  done: number;
  allDone: boolean;
  claimed: boolean;
  /** 이번 주 보너스 받은 날 수 · 목표 · 주간 보너스 받았는지 */
  week: { days: number; target: number; claimed: boolean };
  /** 오늘 글 · 댓글 · 게임으로 받은 포인트 · 하루 한도(출석 · 미션 보너스는 따로) */
  pointsToday: { earned: number; cap: number };
};

/** 오늘(KST) 미션 상태 */
export async function getMissions(userId: string): Promise<MissionStatus> {
  const day = todayKstDate();
  const since = new Date(Date.parse(`${day}T00:00:00+09:00`));
  const week = weekStartKst(day);
  const [attend, quiz, posts, comments, study, claim, weekDays, weekClaim, me] = await Promise.all([
    prisma.dailyAttendance.count({ where: { userId, date: day } }).catch(() => 0),
    prisma.quizAnswer.count({ where: { userId, correct: true, createdAt: { gte: since } } }).catch(() => 0),
    prisma.post.count({ where: { authorId: userId, createdAt: { gte: since }, isAttendanceThread: false } }).catch(() => 0),
    prisma.comment.count({ where: { authorId: userId, createdAt: { gte: since }, isAttendanceCheck: false } }).catch(() => 0),
    prisma.toolSaved.count({ where: { id: `study_${userId}_${day}` } }).catch(() => 0),
    prisma.toolSaved.count({ where: { id: `mission_${userId}_${day}` } }).catch(() => 0),
    prisma.toolSaved.count({ where: { ownerId: userId, kind: "mission-claim", name: { gte: week } } }).catch(() => 0),
    prisma.toolSaved.count({ where: { id: `weekmission_${userId}_${week}` } }).catch(() => 0),
    prisma.user.findUnique({ where: { id: userId }, select: { pointsEarnedDate: true, pointsEarnedToday: true } }).catch(() => null),
  ]);
  const earned = me?.pointsEarnedDate === day ? me.pointsEarnedToday : 0;
  const items: MissionStatus["items"] = [
    { key: "attend", label: "출석체크", done: attend > 0, href: "/attendance" },
    { key: "quiz", label: "오늘의 퀴즈 맞히기", done: quiz > 0, href: "/quiz" },
    { key: "post", label: "글 1개 쓰기", done: posts > 0, href: "/boards/free/write" },
    { key: "comment", label: "댓글 1개 쓰기", done: comments > 0, href: "/boards/free" },
    { key: "study", label: "홀덤 공부 도구 열기", done: study > 0, href: "/study" },
  ];
  const done = items.filter((i) => i.done).length;
  return { items, done, allDone: done === items.length, claimed: claim > 0, week: { days: weekDays, target: WEEK_TARGET, claimed: weekClaim > 0 }, pointsToday: { earned: Math.min(earned, DAILY_POINT_CAP), cap: DAILY_POINT_CAP } };
}

/** 보너스 받기: 5개를 다 했고 오늘 아직 안 받았을 때만(동시에 눌러도 한 번) */
export async function claimMissions(userId: string) {
  const status = await getMissions(userId);
  if (!status.allDone) return { ok: false as const, error: `미션을 ${status.items.length - status.done}개 더 하면 받을 수 있어요.` };
  const day = todayKstDate();
  const made = await prisma.toolSaved
    .createMany({ data: [{ id: `mission_${userId}_${day}`, ownerId: userId, kind: "mission-claim", name: day, dataJson: "{}" }], skipDuplicates: true })
    .catch(() => ({ count: 0 }));
  if (made.count !== 1) return { ok: false as const, error: "오늘 보너스는 이미 받았어요." };
  await grantRewards(userId, MISSION_REWARD.exp, MISSION_REWARD.points, { ignorePointCap: true });
  return { ok: true as const };
}

/** 주간 보너스: 이번 주 WEEK_TARGET일 미션을 다 했고 아직 안 받았을 때만 */
export async function claimWeekly(userId: string) {
  const status = await getMissions(userId);
  if (status.week.days < WEEK_TARGET) return { ok: false as const, error: `이번 주 미션을 ${WEEK_TARGET - status.week.days}일 더 하면 받을 수 있어요.` };
  const week = weekStartKst();
  const made = await prisma.toolSaved
    .createMany({ data: [{ id: `weekmission_${userId}_${week}`, ownerId: userId, kind: "mission-week", name: week, dataJson: "{}" }], skipDuplicates: true })
    .catch(() => ({ count: 0 }));
  if (made.count !== 1) return { ok: false as const, error: "이번 주 보너스는 이미 받았어요." };
  await grantRewards(userId, WEEK_REWARD.exp, WEEK_REWARD.points, { ignorePointCap: true });
  return { ok: true as const };
}
