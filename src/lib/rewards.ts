import type { BoardType } from "@/generated/prisma/enums";

/** 게시판별 작성 EXP. 핸드리뷰가 최고. */
export const POST_EXP: Record<BoardType, number> = {
  HAND_REVIEW: 80,
  ANONYMOUS_REVIEW: 22,
  FREE: 12,
  JOBS: 12,
  PROMO: 8,
};

export const POST_POINTS: Record<BoardType, number> = {
  HAND_REVIEW: 20,
  ANONYMOUS_REVIEW: 8,
  FREE: 4,
  JOBS: 4,
  PROMO: 3,
};

export const ATTENDANCE_EXP = 15;
export const ATTENDANCE_POINTS = 10;
export const COMMENT_EXP = 3;
export const COMMENT_POINTS = 1;
export const ATTENDANCE_MIN_COMMENT_LENGTH = 2;
export const UPVOTE_RECEIVED_EXP = 10;
export const UPVOTE_RECEIVED_POINTS = 2;
