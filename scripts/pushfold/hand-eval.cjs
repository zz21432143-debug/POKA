// 7장 족보 평가기(빠른 비트 계산). 카드 0~51: 숫자 = c >> 2 (0=2 … 12=A), 무늬 = c & 3.
// 반환값이 클수록 강한 패. 같은 값이면 무승부.
"use strict";

const STRAIGHT_HIGH = new Int8Array(1 << 13).fill(-1);
for (let mask = 0; mask < 1 << 13; mask++) {
  for (let top = 12; top >= 4; top--) {
    const need = 0b11111 << (top - 4);
    if ((mask & need) === need) {
      STRAIGHT_HIGH[mask] = top;
      break;
    }
  }
  // A-2-3-4-5(휠): A(12) + 2,3,4,5(0~3)
  if (STRAIGHT_HIGH[mask] < 0 && (mask & 0b1000000001111) === 0b1000000001111) STRAIGHT_HIGH[mask] = 3;
}

const POP = new Uint8Array(1 << 13);
for (let m = 1; m < 1 << 13; m++) POP[m] = POP[m >> 1] + (m & 1);

/** 마스크에서 위에서부터 n개 숫자를 뽑아 점수로(각 4비트) */
function topRanks(mask, n) {
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

const CAT = 16 ** 5;
const counts = new Uint8Array(13);
const suitMask = new Int32Array(4);

function eval7(c0, c1, c2, c3, c4, c5, c6) {
  counts.fill(0);
  suitMask[0] = suitMask[1] = suitMask[2] = suitMask[3] = 0;
  let all = 0;
  const cards = [c0, c1, c2, c3, c4, c5, c6];
  for (let k = 0; k < 7; k++) {
    const c = cards[k];
    const r = c >> 2;
    counts[r]++;
    suitMask[c & 3] |= 1 << r;
    all |= 1 << r;
  }
  // 플러시 · 스트레이트 플러시
  for (let s = 0; s < 4; s++) {
    if (POP[suitMask[s]] >= 5) {
      const sf = STRAIGHT_HIGH[suitMask[s]];
      if (sf >= 0) return 8 * CAT + sf;
      return 5 * CAT + topRanks(suitMask[s], 5);
    }
  }
  let quad = -1, trips1 = -1, trips2 = -1, pair1 = -1, pair2 = -1;
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
  if (quad >= 0) return 7 * CAT + quad * 16 + topRanks(all & ~(1 << quad), 1) / 16 ** 0;
  if (trips1 >= 0 && (trips2 >= 0 || pair1 >= 0)) {
    const second = Math.max(trips2, pair1);
    return 6 * CAT + trips1 * 16 + second;
  }
  const st = STRAIGHT_HIGH[all];
  if (st >= 0) return 4 * CAT + st;
  if (trips1 >= 0) return 3 * CAT + trips1 * 256 + topRanks(all & ~(1 << trips1), 2);
  if (pair1 >= 0 && pair2 >= 0) return 2 * CAT + pair1 * 256 + pair2 * 16 + topRanks(all & ~(1 << pair1) & ~(1 << pair2), 1);
  if (pair1 >= 0) return 1 * CAT + pair1 * 4096 + topRanks(all & ~(1 << pair1), 3);
  return topRanks(all, 5);
}

module.exports = { eval7 };
