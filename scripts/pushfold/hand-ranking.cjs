/* eslint-disable @typescript-eslint/no-require-imports -- node 스크립트 */
// 169개 시작 패 순위: 상대 1명(승률표에서 정확한 가중 평균) · 2명 · 5명 · 8명(몬테카를로) 쇼다운 승률
// 실행: node scripts/pushfold/hand-ranking.cjs <승률표.json> <출력.json> [SAMPLES]
"use strict";
const { Worker, isMainThread, parentPort, workerData } = require("node:worker_threads");
const os = require("node:os");
const fs = require("node:fs");
const { HANDS } = require("./hands.cjs");

const OPPONENTS = [2, 5, 8];

if (isMainThread) {
  const [eqPath, outPath, samplesArg] = process.argv.slice(2);
  const samples = Number(samplesArg || 200000);
  const { eq, w, names } = JSON.parse(fs.readFileSync(eqPath, "utf8"));
  // 상대 1명: 카드 겹침 반영한 가중 평균(승률표 = 쌍마다 30만 판)
  const eq1 = names.map((_, h) => {
    let num = 0;
    let den = 0;
    for (let j = 0; j < 169; j++) {
      num += w[h][j] * eq[h][j];
      den += w[h][j];
    }
    return num / den;
  });
  const n = Math.max(1, os.cpus().length - 1);
  const tasks = [];
  for (let h = 0; h < 169; h++) for (const k of OPPONENTS) tasks.push({ h, k });
  const chunks = Array.from({ length: n }, (_, i) => tasks.filter((_, t) => t % n === i));
  const started = Date.now();
  Promise.all(chunks.map((chunk, i) => new Promise((resolve, reject) => {
    const wk = new Worker(__filename, { workerData: { chunk, samples, seed: 0x2545f491 ^ (i * 7919 + 3) } });
    wk.on("message", resolve);
    wk.on("error", reject);
  }))).then((parts) => {
    const multi = Object.fromEntries(OPPONENTS.map((k) => [k, new Array(169).fill(0)]));
    for (const r of parts.flat()) multi[r.k][r.h] = r.share;
    const round = (x) => Math.round(x * 1e4) / 1e4;
    const out = { samples, names, vs: { 1: eq1.map(round), ...Object.fromEntries(OPPONENTS.map((k) => [k, multi[k].map(round)])) } };
    fs.writeFileSync(outPath, JSON.stringify(out));
    console.log(`끝 ${Math.round((Date.now() - started) / 1000)}초 → ${outPath}`);
  });
} else {
  const { eval7 } = require("./hand-eval.cjs");
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
  for (const { h, k } of workerData.chunk) {
    const combos = HANDS[h].combos;
    let share = 0;
    for (let t = 0; t < workerData.samples; t++) {
      const [a, b] = combos[(rand() * combos.length) | 0];
      let n = 0;
      for (let x = 0; x < 52; x++) if (x !== a && x !== b) deck[n++] = x;
      const need = 5 + 2 * k;
      for (let i = 0; i < need; i++) {
        const r = i + ((rand() * (50 - i)) | 0);
        const tmp = deck[i];
        deck[i] = deck[r];
        deck[r] = tmp;
      }
      const b0 = deck[0], b1 = deck[1], b2 = deck[2], b3 = deck[3], b4 = deck[4];
      const mine = eval7(a, b, b0, b1, b2, b3, b4);
      let best = mine;
      let tied = 1;
      let lost = false;
      for (let o = 0; o < k; o++) {
        const v = eval7(deck[5 + 2 * o], deck[6 + 2 * o], b0, b1, b2, b3, b4);
        if (v > best) {
          lost = true;
          break;
        }
        if (v === best) tied++;
      }
      if (!lost) share += 1 / tied;
    }
    results.push({ h, k, share: share / workerData.samples });
  }
  parentPort.postMessage(results);
}
