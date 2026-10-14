/* eslint-disable @typescript-eslint/no-require-imports -- node 스크립트 */
// 포지션 차트 검증: 저장된 범위(순수 전략) 그대로 두고, 한 사람만 전략을 바꿔 얻을 수 있는 최대 이득(bb)을 모든 칸에서 계산
// 실행: node scripts/pushfold/verify-multi.cjs <승률표.json> <gto-positions.json>
"use strict";
const fs = require("node:fs");
const [eqPath, chartPath] = process.argv.slice(2);
const { eq, w, names } = JSON.parse(fs.readFileSync(eqPath, "utf8"));
const chart = JSON.parse(fs.readFileSync(chartPath, "utf8"));
const N = 169;
const combos = names.map((n) => (n.length === 2 ? 6 : n.endsWith("s") ? 4 : 12));
const unpack = (hex) => {
  const v = new Float64Array(N);
  for (let k = 0; k < 6; k++) {
    const x = parseInt(hex.slice(k * 8, k * 8 + 8), 16);
    for (let b = 0; b < 32; b++) if (x & (1 << b)) v[k * 32 + b] = 1;
  }
  return v;
};

function gainOf(n, p, S, a, pushHex, callHexes) {
  const sb = n - 2;
  const bb = n - 1;
  const callers = [];
  for (let k = p + 1; k < n; k++) callers.push(k);
  const posted = (s) => (s === sb ? 0.5 : s === bb ? 1 : 0);
  const info = callers.map((k) => {
    const E = k === bb ? S - a : S;
    let dead = a;
    if (p !== sb && k !== sb) dead += 0.5;
    if (k !== bb) dead += 1;
    return { E, pot: 2 * E + dead, foldLoss: k === bb ? 1 + a : posted(k), extra: k === bb ? a : 0 };
  });
  const winBlinds = p === sb ? 1 + a : 1.5 + a;
  const pushFold = -posted(p);
  const push = unpack(pushHex);
  const call = callHexes.map(unpack);
  const K = callers.length;
  const q = call.map(() => new Float64Array(N));
  const eqv = call.map(() => new Float64Array(N));
  for (let k = 0; k < K; k++)
    for (let h = 0; h < N; h++) {
      let den = 0, num = 0, es = 0;
      for (let x = 0; x < N; x++) {
        if (!w[h][x]) continue;
        den += w[h][x];
        const v = w[h][x] * call[k][x];
        num += v;
        es += v * eq[h][x];
      }
      q[k][h] = den ? num / den : 0;
      eqv[k][h] = num ? es / num : 0;
    }
  const reach = call.map(() => new Float64Array(N));
  for (let h = 0; h < N; h++) {
    let r = 1;
    for (let k = 0; k < K; k++) {
      reach[k][h] = r;
      r *= 1 - q[k][h];
    }
  }
  let gain = 0;
  let now = 0, best = 0;
  for (let h = 0; h < N; h++) {
    let ev = 0, allFold = 1;
    for (let k = 0; k < K; k++) {
      ev += reach[k][h] * q[k][h] * (eqv[k][h] * info[k].pot - info[k].E);
      allFold *= 1 - q[k][h];
    }
    ev += allFold * winBlinds;
    now += (combos[h] / 1326) * (push[h] ? ev : pushFold);
    best += (combos[h] / 1326) * Math.max(ev, pushFold);
  }
  gain = Math.max(gain, best - now);
  for (let k = 0; k < K; k++) {
    let cn = 0, cb = 0;
    for (let x = 0; x < N; x++) {
      let num = 0, den = 0;
      for (let h = 0; h < N; h++) {
        const wt = w[x][h] * push[h] * reach[k][h];
        if (!wt) continue;
        num += wt * ((1 - eq[h][x]) * info[k].pot - info[k].E - info[k].extra);
        den += wt;
      }
      if (!den) continue;
      const ev = num / den;
      cn += (combos[x] / 1326) * (call[k][x] ? ev : -info[k].foldLoss);
      cb += (combos[x] / 1326) * Math.max(ev, -info[k].foldLoss);
    }
    gain = Math.max(gain, cb - cn);
  }
  return gain;
}

let worst = { gain: 0 };
let sum = 0, count = 0, over = 0;
for (const [mode, m] of Object.entries(chart.modes)) {
  for (const [size, table] of Object.entries(m.tables)) {
    const seats = chart.positions[size];
    for (const [seat, rows] of Object.entries(table)) {
      const p = seats.indexOf(seat);
      for (const r of rows) {
        if (!r) continue;
        const callHexes = seats.slice(p + 1).map((c) => r.calls[c].set);
        const g = gainOf(Number(size), p, r.s, m.ante, r.push, callHexes);
        sum += g;
        count++;
        if (g > 0.01) over++;
        if (g > worst.gain) worst = { gain: g, mode, size, seat, s: r.s };
      }
    }
  }
}
console.log(`검사 ${count}칸 · 평균 이득 ${(sum / count).toFixed(5)}bb · 0.01bb 넘는 칸 ${over}개 · 최대 ${worst.gain.toFixed(5)}bb (${worst.size}인 ${worst.seat} ${worst.s}bb ${worst.mode})`);
