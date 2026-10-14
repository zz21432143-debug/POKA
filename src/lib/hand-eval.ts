/**
 * 7장 족보 평가기(빠른 비트 계산). scripts/pushfold/hand-eval.cjs와 같은 방식입니다
 * (단순 "21가지 5장 조합" 평가기와 20만 판 비교해 불일치 0).
 * 카드 번호 0~51: 숫자 = c >> 2 (0=2 … 12=A), 무늬 = c & 3 (0=♣ 1=♦ 2=♥ 3=♠).
 */
const STRAIGHT_HIGH = new Int8Array(1 << 13).fill(-1);
for (let mask = 0; mask < 1 << 13; mask++) {
  for (let top = 12; top >= 4; top--) {
    const need = 0b11111 << (top - 4);
    if ((mask & need) === need) {
      STRAIGHT_HIGH[mask] = top;
      break;
    }
  }
  if (STRAIGHT_HIGH[mask] < 0 && (mask & 0b1000000001111) === 0b1000000001111) STRAIGHT_HIGH[mask] = 3;
}
const POP = new Uint8Array(1 << 13);
for (let m = 1; m < 1 << 13; m++) POP[m] = POP[m >> 1] + (m & 1);

function topRanks(mask: number, n: number) {
  let score = 0;
  for (let r = 12; r >= 0 && n > 0; r--) {
    if (mask & (1 << r)) {
      score = score * 16 + r;
      n--;
    }
  }
  while (n-- > 0) score *= 16;
  return score;
}

export const CATEGORY_UNIT = 16 ** 5;
const counts = new Uint8Array(13);
const suitMask = new Int32Array(4);

/** 7장(또는 5~6장) 평가: 클수록 강함 */
export function evalCards(cards: ArrayLike<number>): number {
  counts.fill(0);
  suitMask[0] = suitMask[1] = suitMask[2] = suitMask[3] = 0;
  let all = 0;
  for (let k = 0; k < cards.length; k++) {
    const c = cards[k];
    const r = c >> 2;
    counts[r]++;
    suitMask[c & 3] |= 1 << r;
    all |= 1 << r;
  }
  for (let s = 0; s < 4; s++) {
    if (POP[suitMask[s]] >= 5) {
      const sf = STRAIGHT_HIGH[suitMask[s]];
      if (sf >= 0) return 8 * CATEGORY_UNIT + sf;
      return 5 * CATEGORY_UNIT + topRanks(suitMask[s], 5);
    }
  }
  let quad = -1;
  let trips1 = -1;
  let trips2 = -1;
  let pair1 = -1;
  let pair2 = -1;
  for (let r = 12; r >= 0; r--) {
    const n = counts[r];
    if (n === 4) quad = r;
    else if (n === 3) {
      if (trips1 < 0) trips1 = r;
      else if (trips2 < 0) trips2 = r;
    } else if (n === 2) {
      if (pair1 < 0) pair1 = r;
      else if (pair2 < 0) pair2 = r;
    }
  }
  if (quad >= 0) return 7 * CATEGORY_UNIT + quad * 16 + topRanks(all & ~(1 << quad), 1);
  if (trips1 >= 0 && (trips2 >= 0 || pair1 >= 0)) return 6 * CATEGORY_UNIT + trips1 * 16 + Math.max(trips2, pair1);
  const st = STRAIGHT_HIGH[all];
  if (st >= 0) return 4 * CATEGORY_UNIT + st;
  if (trips1 >= 0) return 3 * CATEGORY_UNIT + trips1 * 256 + topRanks(all & ~(1 << trips1), 2);
  if (pair1 >= 0 && pair2 >= 0) return 2 * CATEGORY_UNIT + pair1 * 256 + pair2 * 16 + topRanks(all & ~(1 << pair1) & ~(1 << pair2), 1);
  if (pair1 >= 0) return CATEGORY_UNIT + pair1 * 4096 + topRanks(all & ~(1 << pair1), 3);
  return topRanks(all, 5);
}

export const CATEGORY_NAMES = ["하이카드", "원페어", "투페어", "트리플(셋)", "스트레이트", "플러시", "풀하우스", "포카드", "스트레이트 플러시"] as const;

export function categoryOf(score: number) {
  return Math.floor(score / CATEGORY_UNIT);
}

/** 족보 이름(A 하이 스트레이트 플러시는 로열 플러시) */
export function handName(score: number) {
  const cat = categoryOf(score);
  if (cat === 8 && score % CATEGORY_UNIT === 12) return "로열 플러시";
  return CATEGORY_NAMES[cat];
}

/** "As" "Th" "9c" ↔ 카드 번호 */
const RANK_CHARS = "23456789TJQKA";
const SUIT_CHARS = "cdhs";
export function cardIndex(code: string): number {
  const r = RANK_CHARS.indexOf(code[0]?.toUpperCase() ?? "");
  const s = SUIT_CHARS.indexOf(code[1]?.toLowerCase() ?? "");
  return r < 0 || s < 0 ? -1 : r * 4 + s;
}
export function cardCode(index: number): string {
  return `${RANK_CHARS[index >> 2]}${SUIT_CHARS[index & 3]}`;
}
