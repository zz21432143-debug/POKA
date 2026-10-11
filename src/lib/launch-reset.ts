import type { BoardType } from "@/generated/prisma/enums";

/** 오픈 준비 초기화에서 고를 수 있는 게시물 묶음. */
export const RESET_GROUPS = {
  jobs: { label: "구인구직 공고", boards: ["JOBS", "TALENT", "PICKUP"] },
  community: {
    label: "커뮤니티 글 (자유·질문·현장·핸드리뷰·건의)",
    boards: ["FREE", "RULE_QA", "SKETCH", "HAND_REVIEW", "SUGGESTION", "ANONYMOUS_REVIEW"],
  },
  promo: { label: "공식 홍보 · 대회 캘린더", boards: ["PROMO", "SCHEDULE", "EVENT_POSTER", "OFFICIAL_POSTER"] },
  notice: { label: "공지사항", boards: ["NOTICE"] },
  attendance: { label: "출석체크 기록", boards: [] },
} as const satisfies Record<string, { label: string; boards: readonly BoardType[] }>;

export type ResetGroup = keyof typeof RESET_GROUPS;

/** 실수로 누르지 않도록 그대로 입력해야 하는 문구 */
export const RESET_CONFIRM_TEXT = "게시물 삭제";

export function parseResetGroups(raw: unknown): ResetGroup[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((value): value is ResetGroup => typeof value === "string" && value in RESET_GROUPS);
}
