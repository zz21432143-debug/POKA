export const MAX_LEVEL = 250;
/** 출석 1회 ≈ 레벨 1. 만렙까지는 활동 일수에 가깝게 쌓입니다. */
export const EXP_PER_LEVEL = 100;

export const LEVEL_TITLES = [
  { min: 1, max: 29, title: "연습 딜러" },
  { min: 30, max: 99, title: "딜러" },
  { min: 100, max: 149, title: "메인 딜러" },
  { min: 150, max: 199, title: "러너" },
  { min: 200, max: 249, title: "플로어" },
  { min: 250, max: 250, title: "TD" },
] as const;

export function levelTitle(level: number) {
  const clamped = Math.min(MAX_LEVEL, Math.max(1, Math.trunc(level) || 1));
  const row = LEVEL_TITLES.find((band) => clamped >= band.min && clamped <= band.max);
  return row?.title ?? "연습 딜러";
}

export function requiredExpForLevel(level: number) {
  const clamped = Math.min(MAX_LEVEL, Math.max(1, level));
  return (clamped - 1) * EXP_PER_LEVEL;
}

export function levelFromExp(exp: number) {
  if (exp <= 0) return 1;
  return Math.min(MAX_LEVEL, 1 + Math.floor(exp / EXP_PER_LEVEL));
}

export function buildLevelRows() {
  return Array.from({ length: MAX_LEVEL }, (_, i) => {
    const level = i + 1;
    return { level, requiredExp: requiredExpForLevel(level), markPurchasePoints: 0 };
  });
}
