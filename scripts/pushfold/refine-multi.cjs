/* eslint-disable @typescript-eslint/no-require-imports -- node 스크립트 */
// 포지션 차트 다듬기: 수렴이 느린 경우(앞 포지션 · 깊은 스택)만 반복을 늘려 다시 풀고 결과 파일에 덮어씁니다.
// 실행: FP_ITER=20000 node scripts/pushfold/refine-multi.cjs <승률표.json> <gto-positions.json>
"use strict";
const fs = require("node:fs");
const os = require("node:os");
const { Worker } = require("node:worker_threads");

const [eqPath, outPath] = process.argv.slice(2);
const out = JSON.parse(fs.readFileSync(outPath, "utf8"));
const tasks = [];
for (const [n, maxP] of [[9, 2], [6, 1]]) for (let p = 0; p <= maxP; p++) for (const S of out.stacks) if (S >= 15) for (const [mode, a] of [["none", 0], ["bbante", 1]]) tasks.push({ n, p, S, a, mode });
const workers = Math.max(1, os.cpus().length - 1);
const chunks = Array.from({ length: workers }, (_, k) => tasks.filter((_, i) => i % workers === k));
const pack = (set) => {
  const words = new Array(6).fill(0);
  for (const k of set) words[k >> 5] |= 1 << (k & 31);
  return words.map((x) => (x >>> 0).toString(16).padStart(8, "0")).join("");
};
const started = Date.now();
Promise.all(chunks.map((chunk) => new Promise((resolve, reject) => {
  const wk = new Worker(require.resolve("./nash-multi.cjs"), { workerData: { inPath: eqPath, tasks: chunk } });
  wk.on("message", resolve);
  wk.on("error", reject);
}))).then((parts) => {
  let worst = 0;
  for (const r of parts.flat()) {
    worst = Math.max(worst, r.gain);
    const name = out.positions[r.n][r.p];
    const rows = out.modes[r.mode].tables[r.n][name];
    const i = out.stacks.indexOf(r.S);
    rows[i] = { s: r.S, push: pack(r.pushSet), pushPct: r.pushPct, calls: Object.fromEntries(r.calls.map((c) => [out.positions[r.n][c.seat], { set: pack(c.set), pct: c.pct }])) };
  }
  fs.writeFileSync(outPath, JSON.stringify(out));
  console.log(`다듬기 ${tasks.length}개 · ${Math.round((Date.now() - started) / 1000)}초 · 이 묶음 최대 이득 ${worst.toFixed(5)}bb`);
});
