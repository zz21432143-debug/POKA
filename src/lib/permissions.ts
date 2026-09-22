import type { BoardType } from "@/generated/prisma/enums";

export type WriteUser = {
  isAdmin: boolean;
  memberKind: "COMPANY" | "INDIVIDUAL";
};

export type WriteRole = "admin" | "company" | "individual" | "member";

export const BOARD_WRITE_ROLE: Partial<Record<BoardType, WriteRole>> = {
  EVENT_POSTER: "admin",
  OFFICIAL_POSTER: "admin",
  SCHEDULE: "admin",
  PROMO: "admin",
  JOBS: "company",
  TALENT: "individual",
  PICKUP: "member",
  FREE: "member",
  HAND_REVIEW: "member",
  ANONYMOUS_REVIEW: "member",
};

export function canWriteBoard(user: WriteUser | null, boardType: BoardType): boolean {
  if (!user) return false;
  if (user.isAdmin) return true;
  const role = BOARD_WRITE_ROLE[boardType] ?? "member";
  if (role === "admin") return false;
  if (role === "company") return user.memberKind === "COMPANY";
  if (role === "individual") return user.memberKind === "INDIVIDUAL";
  return true;
}

export function writeDeniedMessage(boardType: BoardType): string {
  const role = BOARD_WRITE_ROLE[boardType] ?? "member";
  if (role === "admin") return "관리자만 작성할 수 있는 게시판입니다.";
  if (role === "company") return "기업·팀 회원만 구인 공고를 등록할 수 있습니다.";
  if (role === "individual") return "개인 회원만 인재 등록을 할 수 있습니다.";
  return "로그인 후 작성할 수 있습니다.";
}
