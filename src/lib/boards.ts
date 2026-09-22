export const BOARD_LABELS = {
  FREE: "딜러 커뮤니티",
  HAND_REVIEW: "핸드리뷰",
  ANONYMOUS_REVIEW: "익명 후기",
  JOBS: "구인",
  PROMO: "공식 홍보",
  EVENT_POSTER: "대회 포스터",
  OFFICIAL_POSTER: "공식 홍보",
  TALENT: "구직 / 인재 등록",
  PICKUP: "급구 / 단기 픽업",
  SCHEDULE: "전국 대회 일정",
} as const;

export type BoardTypeKey = keyof typeof BOARD_LABELS;

export const BOARD_DESCRIPTIONS: Record<BoardTypeKey, string> = {
  FREE: "현장 후기, 룰 질문, 자유 수다",
  HAND_REVIEW: "핸드히스토리와 스팟 분석. 본문에 Fold/Check/Call/Raise 원클릭 투표",
  ANONYMOUS_REVIEW: "매너·서비스·시설·분위기 별점. 작성자 닉네임 비공개, IP만 보관",
  JOBS: "고정 직원 · 지원 딜러 · 딜러 팀 구인",
  PROMO: "검증 매장 공식 홍보물 · 메인 프리미엄 6구좌 연동",
  EVENT_POSTER: "대회 포스터 (일정 게시판으로 이전)",
  OFFICIAL_POSTER: "공식 홍보 (검증 매장 게시판으로 이전)",
  TALENT: "인재 등록",
  PICKUP: "급구",
  SCHEDULE: "메이저·지역 홀덤 대회 일정 (관리자)",
};
