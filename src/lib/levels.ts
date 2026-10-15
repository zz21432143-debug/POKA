export const MAX_LEVEL = 250;
/** 1~29레벨: 출석 1회 ≈ 레벨 1. 기본 한 레벨 경험치(구간별 값은 LEVEL_BANDS) */
export const EXP_PER_LEVEL = 100;

/**
 * 레벨 구간별 한 레벨에 필요한 경험치. 높은 레벨일수록 오래 걸림(매일 출석 + 활동 기준 TD까지 약 1년 반).
 * 바꾸면 경험치 옮기기 마이그레이션(20261027090000_exp_curve)도 같이 맞춰야 함.
 */
export const LEVEL_BANDS = [
  { from: 1, per: 100 },
  { from: 30, per: 150 },
  { from: 100, per: 250 },
  { from: 150, per: 350 },
  { from: 200, per: 450 },
] as const;

/** 이 레벨에서 다음 레벨까지 필요한 경험치 */
export function expForNextLevel(level: number) {
  let per: number = LEVEL_BANDS[0].per;
  for (const band of LEVEL_BANDS) if (level >= band.from) per = band.per;
  return per;
}

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

/** 이 레벨이 되는 데 필요한 누적 경험치 */
export function requiredExpForLevel(level: number) {
  const clamped = Math.min(MAX_LEVEL, Math.max(1, Math.trunc(level) || 1));
  let total = 0;
  for (let l = 1; l < clamped; l++) total += expForNextLevel(l);
  return total;
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
  let level = 1;
  let need = 0;
  while (level < MAX_LEVEL) {
    need += expForNextLevel(level);
    if (exp < need) break;
    level += 1;
  }
  return level;
}

export function buildLevelRows() {
  return Array.from({ length: MAX_LEVEL }, (_, i) => {
    const level = i + 1;
    return { level, requiredExp: requiredExpForLevel(level), markPurchasePoints: 0 };
  });
}
