/* eslint-disable @typescript-eslint/no-require-imports -- node 스크립트 */
// 169×169 프리플랍 올인 승률표 만들기(몬테카를로, 묶음 쌍마다 SAMPLES판, CPU 코어마다 나눠 계산)
// 실행: node scripts/pushfold/equity.cjs <출력.json> [SAMPLES]
"use strict";
const { Worker, isMainThread, parentPort, workerData } = require("node:worker_threads");
const os = require("node:os");
const fs = require("node:fs");
const { HANDS } = require("./hands.cjs");

/** 두 묶음 사이에 카드가 겹치지 않는 콤보 쌍 */
function comboPairs(i, j) {
  const out = [];
  for (const a of HANDS[i].combos) for (const b of HANDS[j].combos) {
    if (a[0] !== b[0] && a[0] !== b[1] && a[1] !== b[0] && a[1] !== b[1]) out.push([a[0], a[1], b[0], b[1]]);
  }
  return out;
}

if (isMainThread) {
  const outPath = process.argv[2];
  const samples = Number(process.argv[3] || 300000);
  if (!outPath) throw new Error("출력 경로를 주세요");
  const tasks = [];
  for (let i = 0; i < 169; i++) for (let j = i + 1; j < 169; j++) tasks.push([i, j]);
  const n = Math.max(1, os.cpus().length - 1);
  const chunks = Array.from({ length: n }, (_, k) => tasks.filter((_, t) => t % n === k));
  const eq = Array.from({ length: 169 }, () => new Array(169).fill(0.5));
  const w = Array.from({ length: 169 }, (_, i) => Array.from({ length: 169 }, (_, j) => comboPairs(i, j).length));
  const started = Date.now();
  let done = 0;
  Promise.all(
    chunks.map(
      (chunk, k) =>
        new Promise((resolve, reject) => {
          const worker = new Worker(__filename, { workerData: { chunk, samples, seed: 0x9e3779b9 ^ (k * 7919 + 1) } });
          worker.on("message", (msg) => {
            if (msg.progress) {
              done += msg.progress;
              if (done % 1000 < msg.progress) console.log(`${done}/${tasks.length} 쌍 · ${Math.round((Date.now() - started) / 1000)}초`);
              return;
            }
            for (const [i, j, e] of msg.results) {
              eq[i][j] = e;
              eq[j][i] = 1 - e;
            }
            resolve();
          });
          worker.on("error", reject);
        }),
    ),
  ).then(() => {
    const round = (x) => Math.round(x * 1e5) / 1e5;
    fs.writeFileSync(outPath, JSON.stringify({ samples, names: HANDS.map((h) => h.name), eq: eq.map((r) => r.map(round)), w }));
    console.log(`끝: ${tasks.length}쌍 × ${samples}판, ${Math.round((Date.now() - started) / 1000)}초 → ${outPath}`);
  });
} else {
  const { eval7 } = require("./hand-eval.cjs");
  const { chunk, samples } = workerData;
  let s = workerData.seed >>> 0 || 1;
  const rand = () => {
    s ^= s << 13;
    s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5;
    s >>>= 0;
    return s / 4294967296;
  };
  const deck = new Int32Array(52);
  const results = [];
  let since = 0;
  for (const [i, j] of chunk) {
    const pairs = comboPairs(i, j);
    let win = 0;
    for (let t = 0; t < samples; t++) {
      const [a, b, c, d] = pairs[(rand() * pairs.length) | 0];
      let n = 0;
      for (let x = 0; x < 52; x++) if (x !== a && x !== b && x !== c && x !== d) deck[n++] = x;
      // 남은 48장에서 보드 5장 뽑기(앞쪽 5칸 섞기)
      for (let k = 0; k < 5; k++) {
        const r = k + ((rand() * (48 - k)) | 0);
        const tmp = deck[k];
        deck[k] = deck[r];
        deck[r] = tmp;
      }
      const v1 = eval7(a, b, deck[0], deck[1], deck[2], deck[3], deck[4]);
      const v2 = eval7(c, d, deck[0], deck[1], deck[2], deck[3], deck[4]);
      win += v1 > v2 ? 1 : v1 === v2 ? 0.5 : 0;
    }
    results.push([i, j, win / samples]);
    if (++since === 50) {
      parentPort.postMessage({ progress: since });
      since = 0;
    }
  }
  parentPort.postMessage({ results });
}
