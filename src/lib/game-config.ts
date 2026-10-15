/** 게임 이긴 보상(화면 · 서버 공통): 하루 perDay판 · 같은 상대 perOpponentPerDay판까지 */
export const WIN_REWARD = {
  points: 30,
  exp: 20,
  affection: 3,
  perDay: 5,
  perOpponentPerDay: 2,
} as const;
