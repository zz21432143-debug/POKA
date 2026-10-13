/** POKA 홍보 문구(대문 · 바닥글 · 현황판 · 검색 설명이 같이 씀) */

export const POKA_TAGLINE = "딜러 구인부터 매장 운영까지, POKA 하나로";

/** POKA 하나로 할 수 있는 것(대문 칩 · 바로가기) */
export const POKA_FEATURES = [
  { label: "딜러 구인", href: "/boards/jobs" },
  { label: "게임 현황판", href: "/tools/board" },
  { label: "딜러 로테이션", href: "/tools/rotation" },
  { label: "매장 관리", href: "/tools" },
] as const;

export const POKA_PROMO_LINE = "딜러 구인 · 게임 현황판 · 딜러 로테이션 · 매장 관리 — POKA 하나로";

/** TV 현황판 맨 아래 줄(영어) */
export const POKA_PROMO_EN = "DEALER JOBS · GAME CLOCK · DEALER ROTATION · STORE TOOLS — ALL IN ONE";
