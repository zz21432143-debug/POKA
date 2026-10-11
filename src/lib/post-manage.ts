import type { BoardType } from "@/generated/prisma/enums";
import { BOARD_WRITE_ROLE, canWriteBoard, type WriteUser } from "@/lib/permissions";

/**
 * 글 수정·삭제 권한.
 * - 공식 게시판(공지·대회 캘린더·공식 홍보·TDA 룰): 그 게시판을 쓸 수 있는 공식 계정(POKA 마스터)만
 * - 그 밖의 게시판: 글쓴이 본인 또는 관리자
 */
export type ManageUser = WriteUser & { id: string };

export function isOfficialBoard(boardType: BoardType) {
  return BOARD_WRITE_ROLE[boardType] === "master";
}

export function canManagePost(user: ManageUser | null | undefined, post: { authorId: string | null; boardType: BoardType }) {
  if (!user) return false;
  if (isOfficialBoard(post.boardType)) return canWriteBoard(user, post.boardType);
  return post.authorId === user.id || user.isAdmin;
}

/** 목록·상세에서 돌아갈 곳 */
export function manageDeniedMessage(boardType: BoardType) {
  return isOfficialBoard(boardType) ? "POKA 공식 계정만 수정·삭제할 수 있습니다." : "글쓴이만 수정·삭제할 수 있습니다.";
}
