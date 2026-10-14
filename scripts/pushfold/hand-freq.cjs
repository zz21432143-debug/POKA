/* eslint-disable @typescript-eslint/no-require-imports -- node 스크립트 */
// 족보별 개수 세기: 5장 2,598,960가지 · 7장(홀덤 최종 패) 133,784,560가지 전부
"use strict";
const { eval7 } = require("./hand-eval.cjs");
const CAT = 16 ** 5;
// 5장: eval7은 7장용이라 5장 평가를 위해 같은 카드 반복 대신 직접 세기 → 7장 평가기에 "빈 카드"가 없으므로 5장은 별도 평가
function cat5(a, b, c, d, e) {
  // 5장 + 서로 다른 무늬·숫자 영향 없는 더미 2장을 넣을 수 없으므로 간단한 5장 판정
  const cs = [a, b, c, d, e];
  const r = cs.map((x) => x >> 2).sort((x, y) => y - x);
  const flush = cs.every((x) => (x & 3) === (a & 3));
  const u = [...new Set(r)];
  let st = -1;
  if (u.length === 5 && r[0] - r[4] === 4) st = r[0];
  if (u.length === 5 && r[0] === 12 && r[1] === 3) st = 3;
  const cnt = {};
  for (const x of r) cnt[x] = (cnt[x] || 0) + 1;
  const g = Object.values(cnt).sort((x, y) => y - x);
  if (st >= 0 && flush) return st === 12 ? 9 : 8;
  if (g[0] === 4) return 7;
  if (g[0] === 3 && g[1] === 2) return 6;
  if (flush) return 5;
  if (st >= 0) return 4;
  if (g[0] === 3) return 3;
  if (g[0] === 2 && g[1] === 2) return 2;
  if (g[0] === 2) return 1;
  return 0;
}
const five = new Array(10).fill(0);
for (let a = 0; a < 52; a++) for (let b = a + 1; b < 52; b++) for (let c = b + 1; c < 52; c++) for (let d = c + 1; d < 52; d++) for (let e = d + 1; e < 52; e++) five[cat5(a, b, c, d, e)]++;
console.log("five", JSON.stringify(five), five.reduce((x, y) => x + y, 0));
const seven = new Array(10).fill(0);
const t = Date.now();
for (let a = 0; a < 52; a++) for (let b = a + 1; b < 52; b++) for (let c = b + 1; c < 52; c++) for (let d = c + 1; d < 52; d++)
  for (let e = d + 1; e < 52; e++) for (let f = e + 1; f < 52; f++) for (let g = f + 1; g < 52; g++) {
    const v = eval7(a, b, c, d, e, f, g);
    const k = Math.floor(v / CAT);
    seven[k === 8 && v % CAT === 12 ? 9 : k]++;
  }
console.log("seven", JSON.stringify(seven), seven.reduce((x, y) => x + y, 0), Math.round((Date.now() - t) / 1000) + "s");
