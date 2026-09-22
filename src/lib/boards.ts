export const BOARD_LABELS = {
  FREE: "자유게시판",
  RULE_QA: "질문 & 답변",
  SKETCH: "현장 스케치",
  HAND_REVIEW: "핸드리뷰",
  ANONYMOUS_REVIEW: "익명 게시판",
  JOBS: "구인 / 구직",
  PROMO: "공식 홍보",
  EVENT_POSTER: "대회 포스터",
  OFFICIAL_POSTER: "공식 홍보",
  TALENT: "개인 구직",
  PICKUP: "급구 / 대타",
  SCHEDULE: "대회 스케줄",
} as const;

export type BoardTypeKey = keyof typeof BOARD_LABELS;

export const BOARD_DESCRIPTIONS: Record<BoardTypeKey, string> = {
  FREE: "자유 수다와 잡담",
  RULE_QA: "룰·판정·진행이 맞는지 질문",
  SKETCH: "현장 사진과 스케치",
  HAND_REVIEW: "핸드히스토리와 스팟 분석. 본문에 Fold/Check/Call/Raise 원클릭 투표",
  ANONYMOUS_REVIEW: "닉네임 비공개. 매장 후기라면 매너·서비스·시설·분위기 별점",
  JOBS: "고정 직원 · 지원 딜러 · 팀 · 급구/대타 · 개인 구직",
  PROMO: "팀·브랜드 공식 홍보, 제휴 및 협찬 · 메인 프리미엄 6구좌 연동",
  EVENT_POSTER: "대회 포스터 (일정 게시판으로 이전)",
  OFFICIAL_POSTER: "공식 홍보 (검증 매장 게시판으로 이전)",
  TALENT: "개인 구직 (구인/구직 > 개인 구직으로 이전)",
  PICKUP: "급구 / 대타 (구인/구직 > 급구/대타로 이전)",
  SCHEDULE: "일자별 / 월별 주요 토너먼트 일정 (관리자)",
};
