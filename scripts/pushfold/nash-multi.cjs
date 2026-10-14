/* eslint-disable @typescript-eslint/no-require-imports -- node 스크립트 */
// 포지션별 푸시/폴드 내시 균형(6인 · 9인 테이블, 먼저 올인 1명 · 뒤 사람들 콜/폴드)
// 실행: node scripts/pushfold/nash-multi.cjs <승률표.json> <출력.json>
//
// 모델(칩 기준, 모두 같은 스택 S bb):
//   앞사람이 다 폴드한 뒤 한 포지션(UTG~SB)이 올인. 뒤 사람들이 차례로 콜/폴드.
//   한 명이 콜하면 나머지는 폴드(콜 한 명만 — 숏스택 차트에서 흔히 쓰는 근사, 오버콜은 아주 강한 패뿐이라 차이가 작음).
//   SB 0.5 · BB 1 · (BB 앤티면 BB가 앤티 1bb를 따로 냄, 죽은 돈).
//   카드 겹침: 올인한 사람 패와 콜한 사람 패 사이만 반영(콜러끼리는 무시).
// 모두의 전략을 가상 플레이로 함께 맞춰 균형을 찾습니다.
"use strict";
const fs = require("node:fs");
const os = require("node:os");
const { Worker, isMainThread, parentPort, workerData } = require("node:worker_threads");

const N = 169;
const inPath = isMainThread ? process.argv[2] : workerData.inPath;
const data = JSON.parse(fs.readFileSync(inPath, "utf8"));
const { eq, w, names } = data;
const combos = names.map((n) => (n.length === 2 ? 6 : n.endsWith("s") ? 4 : 12));

const POSITIONS = {
  6: ["UTG", "HJ", "CO", "BTN", "SB", "BB"],
  9: ["UTG", "UTG+1", "MP", "LJ", "HJ", "CO", "BTN", "SB", "BB"],
};

/** n명 테이블에서 p번째(0=UTG)가 올인할 때의 균형 */
function solve(n, p, S, a, iterations = Number(process.env.FP_ITER || 0) || 1500 + 700 * (n - 1 - p)) {
  const sb = n - 2;
  const bb = n - 1;
  const callers = [];
  for (let k = p + 1; k < n; k++) callers.push(k);
  const K = callers.length;
  const posted = (seat) => (seat === sb ? 0.5 : seat === bb ? 1 : 0);
  // 콜러마다: 걸리는 금액 E, 팟, 콜러 폴드 손실, 콜러가 추가로 내는 앤티
  const info = callers.map((k) => {
    const E = k === bb ? S - a : S;
    let deadOthers = a;
    if (p !== sb && k !== sb) deadOthers += 0.5;
    if (k !== bb) deadOthers += 1;
    return { E, pot: 2 * E + deadOthers, foldLoss: k === bb ? 1 + a : posted(k), extra: k === bb ? a : 0 };
  });
  const allFoldWin = (p === sb ? 0 : 0.5) + 1 + a - (p === sb ? 0.5 : 0) + (p === sb ? 0.5 : 0);
  // 위 식 정리: 올인한 사람이 SB가 아니면 SB 0.5 + BB 1 + 앤티, SB면 BB 1 + 앤티
  const winBlinds = p === sb ? 1 + a : 1.5 + a;
  void allFoldWin;
  const pushFold = -posted(p);

  const push = new Float64Array(N).fill(1);
  const call = Array.from({ length: K }, () => new Float64Array(N).fill(0.3));
  const q = Array.from({ length: K }, () => new Float64Array(N)); // q[k][h] 올인 패 h일 때 콜러 k가 콜할 확률
  const eqv = Array.from({ length: K }, () => new Float64Array(N)); // 콜 범위 상대 승률
  const reach = Array.from({ length: K }, () => new Float64Array(N)); // 앞 콜러들이 다 폴드할 확률
  const brPush = new Float64Array(N);
  const brCall = Array.from({ length: K }, () => new Float64Array(N));

  function refresh() {
    for (let k = 0; k < K; k++) {
      const c = call[k];
      for (let h = 0; h < N; h++) {
        let den = 0;
        let num = 0;
        let eqs = 0;
        const wh = w[h];
        const eh = eq[h];
        for (let x = 0; x < N; x++) {
          const ww = wh[x];
          if (!ww) continue;
          den += ww;
          const v = ww * c[x];
          num += v;
          eqs += v * eh[x];
        }
        q[k][h] = den ? num / den : 0;
        eqv[k][h] = num ? eqs / num : 0;
      }
    }
    for (let h = 0; h < N; h++) {
      let r = 1;
      for (let k = 0; k < K; k++) {
        reach[k][h] = r;
        r *= 1 - q[k][h];
      }
    }
  }

  function pushEv(h) {
    let ev = 0;
    let allFold = 1;
    for (let k = 0; k < K; k++) {
      const pr = reach[k][h] * q[k][h];
      ev += pr * (eqv[k][h] * info[k].pot - info[k].E);
      allFold *= 1 - q[k][h];
    }
    return ev + allFold * winBlinds;
  }

  function callEv(k, x, pushVec) {
    let num = 0;
    let den = 0;
    const wx = w[x];
    const r = reach[k];
    for (let h = 0; h < N; h++) {
      const weight = wx[h] * pushVec[h] * r[h];
      if (!weight) continue;
      num += weight * ((1 - eq[h][x]) * info[k].pot - info[k].E - info[k].extra);
      den += weight;
    }
    return den ? num / den : -Infinity;
  }

  for (let t = 1; t <= iterations; t++) {
    refresh();
    for (let h = 0; h < N; h++) brPush[h] = pushEv(h) > pushFold ? 1 : 0;
    for (let k = 0; k < K; k++) for (let x = 0; x < N; x++) brCall[k][x] = callEv(k, x, push) > -info[k].foldLoss ? 1 : 0;
    const step = 1 / (t + 1);
    for (let h = 0; h < N; h++) push[h] += (brPush[h] - push[h]) * step;
    for (let k = 0; k < K; k++) for (let x = 0; x < N; x++) call[k][x] += (brCall[k][x] - call[k][x]) * step;
  }

  // 최종(순수 전략)과 균형 확인: 한 사람만 바꿔 얻는 이득(bb, 전체 패 평균)
  for (let h = 0; h < N; h++) push[h] = push[h] >= 0.5 ? 1 : 0;
  for (let k = 0; k < K; k++) for (let x = 0; x < N; x++) call[k][x] = call[k][x] >= 0.5 ? 1 : 0;
  refresh();
  let gain = 0;
  {
    let now = 0;
    let best = 0;
    for (let h = 0; h < N; h++) {
      const ev = pushEv(h);
      now += (combos[h] / 1326) * (push[h] ? ev : pushFold);
      best += (combos[h] / 1326) * Math.max(ev, pushFold);
    }
    gain = Math.max(gain, best - now);
  }
  for (let k = 0; k < K; k++) {
    let now = 0;
    let best = 0;
    for (let x = 0; x < N; x++) {
      const ev = callEv(k, x, push);
      if (ev === -Infinity) continue;
      now += (combos[x] / 1326) * (call[k][x] ? ev : -info[k].foldLoss);
      best += (combos[x] / 1326) * Math.max(ev, -info[k].foldLoss);
    }
    gain = Math.max(gain, best - now);
  }
  const toSet = (vec) => {
    const out = [];
    for (let h = 0; h < N; h++) if (vec[h]) out.push(h);
    return out;
  };
  const share = (set) => Math.round((set.reduce((sum, h) => sum + combos[h], 0) / 1326) * 1000) / 10;
  const pushSet = toSet(push);
  return { pushSet, pushPct: share(pushSet), calls: callers.map((seat, k) => ({ seat, set: toSet(call[k]), pct: share(toSet(call[k])) })), gain };
}

function packSet(set) {
  const words = new Array(6).fill(0);
  for (const k of set) words[k >> 5] |= 1 << (k & 31);
  return words.map((x) => (x >>> 0).toString(16).padStart(8, "0")).join("");
}

if (!isMainThread) {
  parentPort.postMessage(workerData.tasks.map((t) => ({ ...t, ...solve(t.n, t.p, t.S, t.a) })));
} else {
  const outPath = process.argv[3];
  const STACKS = [];
  for (let s2 = 4; s2 <= 50; s2++) STACKS.push(s2 / 2); // 2~25bb, 0.5bb 간격
  const MODES = [
    { key: "none", label: "앤티 없음", ante: 0 },
    { key: "bbante", label: "BB 앤티(1BB)", ante: 1 },
  ];
  const tasks = [];
  for (const n of [6, 9]) for (let p = 0; p <= n - 2; p++) for (const m of MODES) for (const S of STACKS) if (S > m.ante + 0.5) tasks.push({ n, p, S, a: m.ante, mode: m.key });
  // 무거운 것(앞 포지션)부터 고르게 나눔
  tasks.sort((x, y) => (y.n - y.p) - (x.n - x.p));
  const workers = Math.max(1, os.cpus().length - 1);
  const chunks = Array.from({ length: workers }, (_, k) => tasks.filter((_, i) => i % workers === k));
  const started = Date.now();
  Promise.all(chunks.map((chunk) => new Promise((resolve, reject) => {
    const wk = new Worker(__filename, { workerData: { inPath, tasks: chunk } });
    wk.on("message", resolve);
    wk.on("error", reject);
  }))).then((parts) => {
    const all = parts.flat();
    let worst = 0;
    const out = { generatedFrom: `포지션별 푸시/폴드 내시(콜 1명 근사) · 승률표 ${data.samples}판 · 0.5bb 간격`, names, stacks: STACKS, positions: POSITIONS, modes: {} };
    for (const m of MODES) {
      out.modes[m.key] = { label: m.label, ante: m.ante, tables: {} };
      for (const n of [6, 9]) {
        const table = {};
        for (let p = 0; p <= n - 2; p++) {
          table[POSITIONS[n][p]] = STACKS.map((S) => {
            const r = all.find((x) => x.n === n && x.p === p && x.mode === m.key && x.S === S);
            if (!r) return null;
            worst = Math.max(worst, r.gain);
            return { s: S, push: packSet(r.pushSet), pushPct: r.pushPct, calls: Object.fromEntries(r.calls.map((c) => [POSITIONS[n][c.seat], { set: packSet(c.set), pct: c.pct }])) };
          });
        }
        out.modes[m.key].tables[n] = table;
      }
    }
    fs.writeFileSync(outPath, JSON.stringify(out));
    console.log(`끝 ${tasks.length}개 · ${Math.round((Date.now() - started) / 1000)}초 · 한 사람만 바꿔 얻는 최대 이득 ${worst.toFixed(5)}bb → ${outPath}`);
  });
}
