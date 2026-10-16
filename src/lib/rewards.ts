import type { BoardType } from "@/generated/prisma/enums";

export const MARK_PRICE_POINTS = 3000;
/** 글·댓글·연습만 쓰는 하루 포인트 한도. 출석·연속 보너스는 이 한도에 넣지 않습니다. */
export const DAILY_POINT_CAP = 490;

/** 레벨용 EXP. 포인트와 별개. 출석 1회가 레벨 1에 가깝습니다. */
export const POST_EXP: Record<BoardType, number> = {
  HAND_REVIEW: 8,
  ANONYMOUS_REVIEW: 5,
  RULE_QA: 5,
  SKETCH: 5,
  FREE: 4,
  JOBS: 5,
  TALENT: 4,
  PICKUP: 4,
  EVENT_POSTER: 4,
  OFFICIAL_POSTER: 4,
  SCHEDULE: 4,
  PROMO: 4,
  NOTICE: 4,
  SUGGESTION: 4,
  TDA: 4,
};

/** 글 포인트(2026-10: 전체 1.3배) */
export const POST_POINTS: Record<BoardType, number> = {
  HAND_REVIEW: 39,
  ANONYMOUS_REVIEW: 20,
  RULE_QA: 20,
  SKETCH: 20,
  FREE: 20,
  JOBS: 26,
  TALENT: 16,
  PICKUP: 16,
  EVENT_POSTER: 16,
  OFFICIAL_POSTER: 16,
  SCHEDULE: 16,
  PROMO: 16,
  NOTICE: 16,
  SUGGESTION: 16,
  TDA: 16,
};

export const ATTENDANCE_EXP = 100;
/** 출석 포인트(2026-10 조정: 375 → 150, 글 · 댓글 · 퀴즈 활동을 하는 회원이 더 받도록 · 이후 전체 1.3배 → 195) */
export const ATTENDANCE_POINTS = 195;
/** 그날 1 · 2 · 3번째로 출석한 사람 추가 경험치 */
export const EARLY_BIRD_EXP = [50, 30, 20] as const;
export const COMMENT_EXP = 2;
export const COMMENT_POINTS = 13;
export const ATTENDANCE_MIN_COMMENT_LENGTH = 2;
export const WEEKLY_HAND_EXP = 20;
export const LUCKY_ATTENDANCE_POINTS = 0;
/** 30일 이후 매주 반복되는 연속 출석 보너스. */
export const STREAK_REPEAT_AFTER = 30;
export const STREAK_REPEAT_EVERY = 7;
export const STREAK_REPEAT_POINTS = 104;
export const STREAK_REPEAT_EXP = 40;

export const STREAK_MILESTONES = [
  { day: 3, points: 39, exp: 20, label: "3일 연속" },
  { day: 7, points: 130, exp: 50, label: "7일 연속" },
  { day: 14, points: 260, exp: 80, label: "14일 연속" },
  { day: 30, points: 520, exp: 150, label: "30일 연속" },
] as const;

export type StreakBonus = { points: number; exp: number; label: string };

export function streakBonusFor(streak: number): StreakBonus | null {
  if (streak < 1) return null;
  const hit = STREAK_MILESTONES.find((row) => row.day === streak);
  if (hit) {
    return { points: hit.points, exp: hit.exp, label: hit.label };
  }
  if (streak > STREAK_REPEAT_AFTER && streak % STREAK_REPEAT_EVERY === 0) {
    return {
      points: STREAK_REPEAT_POINTS,
      exp: STREAK_REPEAT_EXP,
      label: `${streak}일 연속`,
    };
  }
  return null;
}

/** 오늘 출석하면 이어질 연속 일수 기준으로, 다음에 받을 보너스와 남은 날. */
export function nextStreakBonus(currentStreak: number): (StreakBonus & { day: number; daysLeft: number }) | null {
  for (let day = Math.max(currentStreak + 1, 1); day <= currentStreak + STREAK_REPEAT_EVERY + 30; day += 1) {
    const bonus = streakBonusFor(day);
    if (bonus) return { ...bonus, day, daysLeft: day - currentStreak };
  }
  return null;
}

export const POPULAR_UPVOTE_THRESHOLD = 5;
export const BEST_COMMENT_MIN = 2;
export const UPVOTE_RECEIVED_EXP = 1;
export const UPVOTE_RECEIVED_POINTS = 3;

export function formatRewardLine(exp: number, points: number) {
  return `EXP +${exp} · 포인트 +${points}P`;
}

export function postRewardLine(boardType: BoardType) {
  return formatRewardLine(POST_EXP[boardType], POST_POINTS[boardType]);
}

export function commentRewardLine() {
  return formatRewardLine(COMMENT_EXP, COMMENT_POINTS);
}
