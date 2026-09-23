/** POKA는 홀덤만. 바카라·카지노 테이블 게임은 받지 않습니다. */
export class HoldemOnlyError extends Error {
  constructor(message = "POKA는 홀덤 커뮤니티입니다. 바카라·블랙잭·룰렛·슬롯 같은 내용은 올리지 마세요.") {
    super(message);
    this.name = "HoldemOnlyError";
  }
}

const BANNED =
  /바카라|baccarat|블랙잭|blackjack|룰렛|roulette|슬롯머신|카지노\s*딜러|카지노딜러|카지노\s*테이블/i;

export function holdemOnlyViolation(text: string): string | null {
  if (BANNED.test(text)) {
    return new HoldemOnlyError().message;
  }
  return null;
}

export function assertHoldemOnly(...parts: Array<string | null | undefined>) {
  const hit = holdemOnlyViolation(parts.filter(Boolean).join("\n"));
  if (hit) throw new HoldemOnlyError(hit);
}

export function normalizeHandTitle(title: string): string {
  const trimmed = title.trim();
  if (!trimmed) return trimmed;
  if (/홀덤\s*핸드리뷰/.test(trimmed)) return trimmed;
  return `홀덤 핸드리뷰 | ${trimmed}`;
}

export function normalizeReviewTitle(title: string, hasStoreRatings: boolean): string {
  const trimmed = title.trim();
  if (!trimmed || !hasStoreRatings) return trimmed;
  if (trimmed.includes("홀덤펍")) return trimmed;
  if (trimmed.includes("후기")) return trimmed.replace("후기", "홀덤펍 후기");
  return `${trimmed} · 홀덤펍 후기`;
}
