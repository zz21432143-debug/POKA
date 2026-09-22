export const BOARD_LABELS = {
  FREE: "딜러 커뮤니티",
  HAND_REVIEW: "핸드리뷰",
  ANONYMOUS_REVIEW: "익명 후기",
  JOBS: "구인 게시판",
  PROMO: "프리미엄 배너",
  EVENT_POSTER: "대회 & 이벤트 포스터",
  OFFICIAL_POSTER: "공식 홍보 포스터",
  TALENT: "구직 / 인재 등록",
  PICKUP: "급구 / 단기 픽업",
  SCHEDULE: "전국 대회 일정",
} as const;

export type BoardTypeKey = keyof typeof BOARD_LABELS;

export const BOARD_DESCRIPTIONS: Record<BoardTypeKey, string> = {
  FREE: "현장 후기, 룰 질문, 자유 수다",
  HAND_REVIEW: "핸드히스토리와 스팟 분석",
  ANONYMOUS_REVIEW: "룸/딜러 후기. 작성자 닉네임 비공개, IP만 보관",
  JOBS: "딜러 팀·카지노·홀덤펍 정식 구인 (기업·팀 회원)",
  PROMO: "메인 배너 6구좌",
  EVENT_POSTER: "메인 대회·토너먼트 공식 포스터 (관리자)",
  OFFICIAL_POSTER: "제휴 팀·스폰서·공지 포스터 (관리자)",
  TALENT: "딜러·플로어·칩스 스태프 인재 등록 (개인 회원)",
  PICKUP: "일일 대타·주말 단기 스태프 급구 (전체 회원)",
  SCHEDULE: "날짜별 전국 토너먼트·카지노 이벤트",
};
