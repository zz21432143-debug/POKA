export const HOME_PROMO_VISIBLE = 3;
/** 홈 로테이션 풀 상한. 3칸 노출 + 대기분이 너무 많으면 한 장이 다시 보이기까지 오래 걸립니다. */
export const HOME_PROMO_MAX_POOL = 9;
/** 한 칸이 바뀌는 간격. 포스터를 읽을 시간(약 6초)을 주고 다음 칸으로 넘어갑니다. */
export const HOME_PROMO_ROTATE_MS = 6000;

export type HomePromo = {
  key: string;
  href: string;
  title: string;
  image: string;
  location?: string | null;
  tag?: string | null;
  isPaid?: boolean;
};

export function initialVisiblePromos(pool: HomePromo[], visibleCount = HOME_PROMO_VISIBLE) {
  return pool.slice(0, Math.min(visibleCount, pool.length));
}

export function pickReplacement(
  visible: HomePromo[],
  pool: HomePromo[],
  slot: number,
  random = Math.random,
): HomePromo | null {
  if (pool.length === 0 || visible.length === 0) return null;
  const shown = new Set(visible.map((item) => item.key));
  const waiting = pool.filter((item) => !shown.has(item.key));
  if (waiting.length === 0) return null;
  const pick = waiting[Math.floor(random() * waiting.length)] ?? null;
  if (!pick) return null;
  if (visible[slot] && visible[slot].key === pick.key) return null;
  return pick;
}

export function nextRotateSlot(slot: number, visibleCount = HOME_PROMO_VISIBLE) {
  if (visibleCount <= 0) return 0;
  return (slot + 1) % visibleCount;
}
