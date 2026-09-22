import type { BoardType } from "@/generated/prisma/enums";

/** 게시판별 작성 EXP. 핸드리뷰가 최고. */
export const POST_EXP: Record<BoardType, number> = {
  HAND_REVIEW: 80,
  ANONYMOUS_REVIEW: 22,
  RULE_QA: 14,
  SKETCH: 14,
  FREE: 12,
  JOBS: 16,
  TALENT: 12,
  PICKUP: 10,
  EVENT_POSTER: 8,
  OFFICIAL_POSTER: 8,
  SCHEDULE: 8,
  PROMO: 8,
};

export const POST_POINTS: Record<BoardType, number> = {
  HAND_REVIEW: 20,
  ANONYMOUS_REVIEW: 8,
  RULE_QA: 5,
  SKETCH: 5,
  FREE: 4,
  JOBS: 6,
  TALENT: 4,
  PICKUP: 3,
  EVENT_POSTER: 3,
  OFFICIAL_POSTER: 3,
  SCHEDULE: 3,
  PROMO: 3,
};

export const ATTENDANCE_EXP = 15;
export const ATTENDANCE_POINTS = 10;
export const COMMENT_EXP = 3;
export const COMMENT_POINTS = 1;
export const ATTENDANCE_MIN_COMMENT_LENGTH = 2;
export const WEEKLY_HAND_EXP = 1000;
export const LUCKY_ATTENDANCE_POINTS = 30;
export const STREAK_BONUS_EXP = 20;
export const POPULAR_UPVOTE_THRESHOLD = 5;
export const BEST_COMMENT_MIN = 2;
