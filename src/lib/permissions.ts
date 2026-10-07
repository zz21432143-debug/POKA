import type { BoardType } from "@/generated/prisma/enums";

export type WriteUser = {
  isAdmin: boolean;
  isMaster?: boolean;
  memberKind: "COMPANY" | "INDIVIDUAL";
  isDealerVerified?: boolean;
};

export type WriteRole = "master" | "member";

/** 대회 스케줄·공식 홍보·공지는 마스터만. 그 외는 로그인한 회원이면 레벨과 무관. */
export const BOARD_WRITE_ROLE: Partial<Record<BoardType, WriteRole>> = {
  EVENT_POSTER: "master",
  OFFICIAL_POSTER: "master",
  SCHEDULE: "master",
  PROMO: "master",
  NOTICE: "master",
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
  if (boardType === "ANONYMOUS_REVIEW") return false;
  const role = BOARD_WRITE_ROLE[boardType] ?? "member";
  if (role === "master") return Boolean(user.isMaster);
  return true;
}

export function writeDeniedMessage(boardType: BoardType): string {
  if (boardType === "ANONYMOUS_REVIEW") return "익명 게시판은 운영을 종료했습니다.";
  const role = BOARD_WRITE_ROLE[boardType] ?? "member";
  if (role === "master") return "마스터 계정만 작성할 수 있는 게시판입니다.";
  return "로그인 후 작성할 수 있습니다.";
}
