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

/** 마스터·관리자 계정은 레벨 명칭을 붙이지 않고 Lv.만 씁니다. */
export function memberRankTitle(opts: { level: number; isMaster?: boolean; isAdmin?: boolean }) {
  if (opts.isMaster || opts.isAdmin) return null;
  return levelTitle(opts.level);
}

export function requiredExpForLevel(level: number) {
  const clamped = Math.min(MAX_LEVEL, Math.max(1, level));
  return (clamped - 1) * EXP_PER_LEVEL;
}

export function progressFromExp(level: number, exp: number) {
  const currentLevelExp = requiredExpForLevel(level);
  const nextLevelExp = level >= MAX_LEVEL ? null : requiredExpForLevel(level + 1);
  const span = nextLevelExp == null ? 1 : Math.max(nextLevelExp - currentLevelExp, 1);
  const gained = Math.max(exp - currentLevelExp, 0);
  const progressPercent =
    nextLevelExp == null ? 100 : Math.min(100, Math.round((gained / span) * 100));
  return { currentLevelExp, nextLevelExp, progressPercent };
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
