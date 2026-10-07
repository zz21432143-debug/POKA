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
  NOTICE: "공지사항",
} as const;

export type BoardTypeKey = keyof typeof BOARD_LABELS;

export const BOARD_DESCRIPTIONS: Record<BoardTypeKey, string> = {
  FREE: "자유 수다와 잡담",
  RULE_QA: "룰·판정·진행이 맞는지 질문",
  SKETCH: "현장 사진과 스케치",
  HAND_REVIEW: "홀덤 핸드를 그리고 Fold/Check/Call/Raise로 투표합니다. 제목에 홀덤 핸드리뷰가 붙습니다.",
  ANONYMOUS_REVIEW: "닉네임 비공개. 글·댓글의 민·형사상 책임은 작성자 본인에게 있습니다.",
  JOBS: "홀덤펍 고정 딜러 · 스팟 · 팀 · 급구/대타 · 개인 구직. 제목은 [지역] 홀덤 형식으로 붙습니다.",
  PROMO: "팀·브랜드 공식 홍보, 제휴 및 협찬. 등록은 마스터만 가능합니다.",
  EVENT_POSTER: "대회 포스터 (일정 게시판으로 이전)",
  OFFICIAL_POSTER: "공식 홍보 (검증 매장 게시판으로 이전)",
  TALENT: "개인 구직 (구인/구직 > 개인 구직으로 이전)",
  PICKUP: "급구 / 대타 (구인/구직 > 급구/대타로 이전)",
  SCHEDULE: "매주 '이번 주 홀덤 대회 일정' 허브가 자동으로 생깁니다. 등록은 마스터만 가능합니다.",
  NOTICE: "운영 공지. 작성은 마스터 계정만 가능합니다.",
};
