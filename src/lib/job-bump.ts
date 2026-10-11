/** 공고 끌어올리기는 작성자 기준 공고마다 하루 한 번입니다. 운영진은 제한이 없습니다. */
export const BUMP_INTERVAL_MS = 24 * 60 * 60 * 1000;

export function nextBumpAt(bumpedAt: Date | string): Date {
  return new Date(new Date(bumpedAt).getTime() + BUMP_INTERVAL_MS);
}

export function canBumpNow(bumpedAt: Date | string, now = new Date()): boolean {
  return nextBumpAt(bumpedAt).getTime() <= now.getTime();
}
