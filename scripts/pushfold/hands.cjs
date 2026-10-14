/* eslint-disable @typescript-eslint/no-require-imports -- node 스크립트 */
// 169개 시작 패 묶음(13×13 표 순서). 표의 행·열 = A K Q … 2, 대각선 = 페어, 오른쪽 위 = 수딧(s), 왼쪽 아래 = 오프수딧(o).
"use strict";

const RANKS = "AKQJT98765432"; // 표 순서(위→아래)
const rankValue = (ch) => 12 - RANKS.indexOf(ch); // A=12 … 2=0

const HANDS = [];
for (let row = 0; row < 13; row++) {
  for (let col = 0; col < 13; col++) {
    const hi = RANKS[Math.min(row, col)];
    const lo = RANKS[Math.max(row, col)];
    const name = row === col ? hi + lo : col > row ? `${hi}${lo}s` : `${hi}${lo}o`;
    const r1 = rankValue(hi);
    const r2 = rankValue(lo);
    const combos = [];
    for (let s1 = 0; s1 < 4; s1++) {
      for (let s2 = 0; s2 < 4; s2++) {
        const a = r1 * 4 + s1;
        const b = r2 * 4 + s2;
        if (row === col) {
          if (s1 < s2) combos.push([a, b]);
        } else if (col > row) {
          if (s1 === s2) combos.push([a, b]);
        } else if (s1 !== s2) combos.push([a, b]);
      }
    }
    HANDS.push({ name, row, col, combos });
  }
}

module.exports = { HANDS, RANKS };
