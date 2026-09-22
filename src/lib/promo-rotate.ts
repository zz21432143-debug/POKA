export const HOME_PROMO_VISIBLE = 3;
/** 홈 로테이션 풀 상한. 3칸 노출 + 대기분이 너무 많으면 한 장이 다시 보이기까지 오래 걸립니다. */
export const HOME_PROMO_MAX_POOL = 9;
/** 한 칸씩 왼쪽으로 넘어가는 간격. */
export const HOME_PROMO_ROTATE_MS = 3000;
/** 카드가 한 칸 이동하는 CSS 슬라이드 시간. */
export const HOME_PROMO_SLIDE_MS = 500;

export type HomePromo = {
  key: string;
  href: string;
  title: string;
  image: string;
  location?: string | null;
  tag?: string | null;
  isPaid?: boolean;
};

export function wrapIndex(index: number, length: number) {
  if (length <= 0) return 0;
  return ((index % length) + length) % length;
}

export function shiftCarouselIndex(index: number, delta: number, length: number) {
  return wrapIndex(index + delta, length);
}

/** 루프용 가장자리 복제 장 수. 3칸 뷰포트가 비지 않도록 풀 길이를 넘지 않게 잡습니다. */
export function carouselCloneCount(length: number, visible = HOME_PROMO_VISIBLE) {
  if (length <= 1) return 0;
  return Math.min(visible, length);
}

export function buildLoopTrack<T>(items: T[], cloneCount: number): T[] {
  if (items.length === 0 || cloneCount <= 0) return items.slice();
  return [...items.slice(-cloneCount), ...items, ...items.slice(0, cloneCount)];
}

export function loopTrackStartIndex(cloneCount: number) {
  return Math.max(0, cloneCount);
}

/**
 * 복제 구간으로 슬라이드한 뒤, 같은 실카드를 가리키는 인덱스로 점프합니다.
 * 이미 실구간이면 null.
 */
export function snapLoopIndex(index: number, length: number, cloneCount: number): number | null {
  if (length <= 0 || cloneCount <= 0) return null;
  const start = cloneCount;
  const end = cloneCount + length;
  if (index >= end) return start + (index - end);
  if (index < start) return end - (start - index);
  return null;
}
