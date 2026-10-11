import type { BoardType } from "@/generated/prisma/enums";

export type WriteUser = {
  isAdmin: boolean;
  isMaster?: boolean;
  nickname?: string;
  memberKind: "COMPANY" | "INDIVIDUAL";
  isDealerVerified?: boolean;
};

export type WriteRole = "master" | "member";

/** 대회 스케줄·공식 홍보·공지·TDA 룰을 쓸 수 있는 공식 계정 닉네임 */
export const OFFICIAL_ACCOUNT_NICKNAME = "POKA";

/** 공식 계정: 마스터 권한이 있고 닉네임이 POKA인 계정 하나뿐입니다. */
export function isOfficialAccount(user: WriteUser | null | undefined) {
  return Boolean(user?.isMaster && user.nickname === OFFICIAL_ACCOUNT_NICKNAME);
}

/** 대회 스케줄·공식 홍보·공지는 공식 계정(POKA 마스터)만. 그 외는 로그인한 회원이면 레벨과 무관. */
export const BOARD_WRITE_ROLE: Partial<Record<BoardType, WriteRole>> = {
  EVENT_POSTER: "master",
  OFFICIAL_POSTER: "master",
  SCHEDULE: "master",
  PROMO: "master",
  NOTICE: "master",
  TDA: "master",
  JOBS: "member",
  TALENT: "member",
  PICKUP: "member",
  FREE: "member",
  RULE_QA: "member",
  SKETCH: "member",
  HAND_REVIEW: "member",
  SUGGESTION: "member",
};

const CLOSED_BOARDS = new Set<BoardType>([
  "ANONYMOUS_REVIEW",
  "TALENT",
  "PICKUP",
  "EVENT_POSTER",
  "OFFICIAL_POSTER",
]);

export function canWriteBoard(user: WriteUser | null, boardType: BoardType): boolean {
  if (!user) return false;
  if (CLOSED_BOARDS.has(boardType)) return false;
  const role = BOARD_WRITE_ROLE[boardType] ?? "member";
  if (role === "master") return isOfficialAccount(user);
  return true;
}

export function writeDeniedMessage(boardType: BoardType): string {
  if (boardType === "ANONYMOUS_REVIEW") return "익명 게시판은 운영을 종료했습니다.";
  if (CLOSED_BOARDS.has(boardType)) return "이 게시판은 더 이상 작성할 수 없습니다.";
  const role = BOARD_WRITE_ROLE[boardType] ?? "member";
  if (role === "master") return "POKA 공식 계정만 작성할 수 있는 게시판입니다.";
  return "로그인 후 작성할 수 있습니다.";
}
