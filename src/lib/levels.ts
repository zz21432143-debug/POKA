export const MAX_LEVEL = 250;
/** 출석 1회 ≈ 레벨 1. 만렙까지는 활동 일수에 가깝게 쌓입니다. */
export const EXP_PER_LEVEL = 100;

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
