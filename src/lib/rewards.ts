import type { BoardType } from "@/generated/prisma/enums";

export const MARK_PRICE_POINTS = 3000;
/** 하루 최대 포인트. 마크 3,000P는 출석만으로도 8일. */
export const DAILY_POINT_CAP = 375;

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
};

export const POST_POINTS: Record<BoardType, number> = {
  HAND_REVIEW: 20,
  ANONYMOUS_REVIEW: 10,
  RULE_QA: 10,
  SKETCH: 10,
  FREE: 8,
  JOBS: 10,
  TALENT: 8,
  PICKUP: 8,
  EVENT_POSTER: 8,
  OFFICIAL_POSTER: 8,
  SCHEDULE: 8,
  PROMO: 8,
  NOTICE: 8,
};

export const ATTENDANCE_EXP = 100;
export const ATTENDANCE_POINTS = 375;
export const COMMENT_EXP = 2;
export const COMMENT_POINTS = 5;
export const ATTENDANCE_MIN_COMMENT_LENGTH = 2;
export const WEEKLY_HAND_EXP = 20;
export const LUCKY_ATTENDANCE_POINTS = 0;
/** 30일 이후 매주 반복되는 연속 출석 보너스. */
export const STREAK_REPEAT_AFTER = 30;
export const STREAK_REPEAT_EVERY = 7;
export const STREAK_REPEAT_POINTS = 150;
export const STREAK_REPEAT_EXP = 40;

export const STREAK_MILESTONES = [
  { day: 3, points: 50, exp: 20, label: "3일 연속" },
  { day: 7, points: 150, exp: 50, label: "7일 연속" },
  { day: 14, points: 300, exp: 80, label: "14일 연속" },
  { day: 30, points: 750, exp: 150, label: "30일 연속" },
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

export const POPULAR_UPVOTE_THRESHOLD = 5;
export const BEST_COMMENT_MIN = 2;
export const UPVOTE_RECEIVED_EXP = 1;
export const UPVOTE_RECEIVED_POINTS = 2;
