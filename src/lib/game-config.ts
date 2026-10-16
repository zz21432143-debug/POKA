/** 진 사람 위로 경험치(짧은 판 · 봇 판 제외 · 하루 perDay판까지) */
export const LOSE_REWARD = { exp: 5, perDay: 5 } as const;

/** 게임 이긴 보상(화면 · 서버 공통): 하루 perDay판 · 같은 상대 perOpponentPerDay판까지 */
export const WIN_REWARD = {
  points: 39,
  exp: 20,
  affection: 3,
  perDay: 5,
  perOpponentPerDay: 2,
} as const;
