import type { BoardType } from "@/generated/prisma/enums";

export type WriteUser = {
  isAdmin: boolean;
  memberKind: "COMPANY" | "INDIVIDUAL";
  isDealerVerified?: boolean;
};

export type WriteRole = "admin" | "member";

/** 공식 홍보·대회 스케줄은 관리자만. 그 외 글 보드는 회원. */
export const BOARD_WRITE_ROLE: Partial<Record<BoardType, WriteRole>> = {
  EVENT_POSTER: "admin",
  OFFICIAL_POSTER: "admin",
  SCHEDULE: "admin",
  PROMO: "admin",
  JOBS: "member",
  TALENT: "member",
  PICKUP: "member",
  FREE: "member",
  RULE_QA: "member",
  SKETCH: "member",
  HAND_REVIEW: "member",
};

export function canWriteBoard(user: WriteUser | null, boardType: BoardType): boolean {
  if (!user) return false;
  if (user.isAdmin) return true;
  const role = BOARD_WRITE_ROLE[boardType] ?? "member";
  if (role === "admin") return false;
  return true;
}

export function writeDeniedMessage(boardType: BoardType): string {
  const role = BOARD_WRITE_ROLE[boardType] ?? "member";
  if (role === "admin") return "관리자만 작성할 수 있는 게시판입니다.";
  return "로그인 후 작성할 수 있습니다.";
}
