export const BOARD_LABELS = {
  FREE: "자유게시판",
  HAND_REVIEW: "핸드리뷰",
  ANONYMOUS_REVIEW: "익명 후기",
  JOBS: "구인구직",
  PROMO: "홍보게시판",
} as const;

export type BoardTypeKey = keyof typeof BOARD_LABELS;

export const BOARD_DESCRIPTIONS: Record<BoardTypeKey, string> = {
  FREE: "캐주얼 이야기, 룰 질문, 잡담",
  HAND_REVIEW: "핸드히스토리와 스팟 분석",
  ANONYMOUS_REVIEW: "룸/딜러 후기. 작성자 닉네임 비공개, IP만 보관",
  JOBS: "딜러·스태프 구인/구직",
  PROMO: "스터디, 이벤트, 클럽 홍보",
};
