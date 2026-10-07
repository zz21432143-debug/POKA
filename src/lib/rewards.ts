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
export const STREAK_BONUS_EXP = 20;
export const POPULAR_UPVOTE_THRESHOLD = 5;
export const BEST_COMMENT_MIN = 2;
export const UPVOTE_RECEIVED_EXP = 1;
export const UPVOTE_RECEIVED_POINTS = 2;
