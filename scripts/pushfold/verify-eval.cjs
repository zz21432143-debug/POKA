// 검증: 빠른 평가기 vs 느리지만 단순한 "7장 중 5장 21가지 다 따지기" 평가기 — 승패 순서가 항상 같은지
"use strict";
const { eval7 } = require("./hand-eval.cjs");
function eval5(cs) {
  const r = cs.map((c) => c >> 2).sort((a, b) => b - a);
  const flush = cs.every((c) => (c & 3) === (cs[0] & 3));
  const uniq = [...new Set(r)];
  let straight = -1;
  if (uniq.length === 5 && r[0] - r[4] === 4) straight = r[0];
  if (uniq.length === 5 && r[0] === 12 && r[1] === 3 && r[4] === 0) straight = 3;
  const cnt = {};
  for (const x of r) cnt[x] = (cnt[x] || 0) + 1;
  const groups = Object.entries(cnt).map(([k, v]) => [v, +k]).sort((a, b) => b[0] - a[0] || b[1] - a[1]);
  const kick = groups.map((g) => g[1]);
  let cat;
  if (straight >= 0 && flush) cat = 8;
  else if (groups[0][0] === 4) cat = 7;
  else if (groups[0][0] === 3 && groups[1][0] === 2) cat = 6;
  else if (flush) cat = 5;
  else if (straight >= 0) cat = 4;
  else if (groups[0][0] === 3) cat = 3;
  else if (groups[0][0] === 2 && groups[1][0] === 2) cat = 2;
  else if (groups[0][0] === 2) cat = 1;
  else cat = 0;
  const ks = cat === 8 || cat === 4 ? [straight] : cat === 5 || cat === 0 ? r : kick;
  return [cat, ...ks];
}
function best7(cs) {
  let best = null;
  for (let a = 0; a < 7; a++) for (let b = a + 1; b < 7; b++) {
    const five = cs.filter((_, i) => i !== a && i !== b);
    const v = eval5(five);
    if (!best || cmp(v, best) > 0) best = v;
  }
  return best;
}
function cmp(x, y) {
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    const d = (x[i] ?? -1) - (y[i] ?? -1);
    if (d) return Math.sign(d);
  }
  return 0;
}
let bad = 0;
const N = 200000;
for (let t = 0; t < N; t++) {
  const deck = [...Array(52).keys()];
  for (let i = 0; i < 9; i++) { const j = i + Math.floor(Math.random() * (52 - i)); [deck[i], deck[j]] = [deck[j], deck[i]]; }
  const board = deck.slice(4, 9);
  const h1 = [deck[0], deck[1], ...board], h2 = [deck[2], deck[3], ...board];
  const fast = Math.sign(eval7(...h1) - eval7(...h2));
  const slow = cmp(best7(h1), best7(h2));
  if (fast !== slow) { bad++; if (bad < 5) console.log("MISMATCH", h1, h2, fast, slow); }
}
console.log(`${N}판 비교, 불일치 ${bad}`);
