// 헤즈업(SB vs BB) 푸시/폴드 내시 균형 계산 → 앱에서 쓰는 차트 JSON
// 실행: node scripts/pushfold/nash.cjs <승률표.json> <출력.json>
//
// 모델(칩 기준, 둘 다 같은 유효 스택 S bb):
//   SB 0.5bb · BB 1bb(+ BB 앤티 a)를 낸 뒤, SB는 올인 또는 폴드, BB는 콜 또는 폴드.
//   SB 폴드: -0.5 / SB 올인 · BB 폴드: +(1 + a)
//   올인 · 콜: 실제로 걸리는 금액 E = S - a(앤티는 죽은 돈), 팟 2E + a → SB 변화 = 승률×(2E + a) - E
//   BB 폴드: -(1 + a) / BB 콜: (1 - SB 승률)×(2E + a) - (E + a)
// 둘이 나눠 갖는 게임(제로섬)이라 가상 플레이(fictitious play)로 균형에 수렴합니다.
"use strict";
const fs = require("node:fs");
const os = require("node:os");
const { Worker, isMainThread, parentPort, workerData } = require("node:worker_threads");

const [inPath, outPath] = isMainThread ? process.argv.slice(2) : [workerData.inPath, null];
const data = JSON.parse(fs.readFileSync(inPath, "utf8"));
const { eq, w, names } = data;
const N = 169;
const combos = names.map((n) => (n.length === 2 ? 6 : n.endsWith("s") ? 4 : 12));

function solve(S, a, iterations = 3000) {
  const E = S - a;
  const pot = 2 * E + a;
  const push = new Float64Array(N).fill(1);
  const call = new Float64Array(N).fill(0.5);
  const brPush = new Float64Array(N);
  const brCall = new Float64Array(N);
  const evPush = new Float64Array(N);
  const evCall = new Float64Array(N);
  for (let t = 1; t <= iterations; t++) {
    // SB 최선 대응
    for (let i = 0; i < N; i++) {
      let num = 0;
      let den = 0;
      for (let j = 0; j < N; j++) {
        const wij = w[i][j];
        if (!wij) continue;
        const c = call[j];
        num += wij * ((1 - c) * (1 + a) + c * (eq[i][j] * pot - E));
        den += wij;
      }
      evPush[i] = num / den;
      brPush[i] = evPush[i] > -0.5 ? 1 : 0;
    }
    // BB 최선 대응(SB가 올인하는 패 범위에 맞서)
    for (let j = 0; j < N; j++) {
      let num = 0;
      let den = 0;
      for (let i = 0; i < N; i++) {
        const weight = w[j][i] * push[i];
        if (!weight) continue;
        num += weight * ((1 - eq[i][j]) * pot - (E + a));
        den += weight;
      }
      evCall[j] = den > 0 ? num / den : -Infinity;
      brCall[j] = evCall[j] > -(1 + a) ? 1 : 0;
    }
    const step = 1 / (t + 1);
    for (let k = 0; k < N; k++) {
      push[k] += (brPush[k] - push[k]) * step;
      call[k] += (brCall[k] - call[k]) * step;
    }
  }
  const pushSet = [];
  const callSet = [];
  for (let k = 0; k < N; k++) {
    if (push[k] >= 0.5) pushSet.push(k);
    if (call[k] >= 0.5) callSet.push(k);
  }
  const share = (set) => set.reduce((sum, k) => sum + combos[k], 0) / 1326;
  // 균형 확인: 최종 범위(순수 전략)에서 한쪽만 바꿔서 얻는 최대 이득(bb). 0에 가까우면 균형.
  const pureCall = new Float64Array(N);
  const purePush = new Float64Array(N);
  for (const k of callSet) pureCall[k] = 1;
  for (const k of pushSet) purePush[k] = 1;
  let sbGain = 0;
  let sbNow = 0;
  let sbBest = 0;
  for (let i = 0; i < N; i++) {
    let num = 0;
    let den = 0;
    for (let j = 0; j < N; j++) {
      if (!w[i][j]) continue;
      const c = pureCall[j];
      num += w[i][j] * ((1 - c) * (1 + a) + c * (eq[i][j] * pot - E));
      den += w[i][j];
    }
    const ev = num / den;
    const now = purePush[i] ? ev : -0.5;
    const best = Math.max(ev, -0.5);
    sbNow += (combos[i] / 1326) * now;
    sbBest += (combos[i] / 1326) * best;
  }
  sbGain = sbBest - sbNow;
  let bbNow = 0;
  let bbBest = 0;
  for (let j = 0; j < N; j++) {
    let num = 0;
    let den = 0;
    let reach = 0;
    for (let i = 0; i < N; i++) {
      const weight = w[j][i] * purePush[i];
      reach += w[j][i];
      if (!weight) continue;
      num += weight * ((1 - eq[i][j]) * pot - (E + a));
      den += weight;
    }
    if (!den) continue;
    const ev = num / den;
    const pushed = den / reach;
    const now = pureCall[j] ? ev : -(1 + a);
    const best = Math.max(ev, -(1 + a));
    bbNow += (combos[j] / 1326) * pushed * now;
    bbBest += (combos[j] / 1326) * pushed * best;
  }
  return { pushSet, callSet, pushPct: share(pushSet), callPct: share(callSet), gain: Math.max(sbGain, bbBest - bbNow) };
}

if (!isMainThread) {
  const results = workerData.tasks.map(({ mode, S, ante }) => ({ mode, S, ...solve(S, ante) }));
  parentPort.postMessage(results);
}

const STACKS = [];
for (let s10 = 10; s10 <= 250; s10++) STACKS.push(s10 / 10);
const MODES = [
  { key: "none", label: "앤티 없음", ante: 0 },
  { key: "bbante", label: "BB 앤티(1BB)", ante: 1 },
];

/** 169개를 비트로(32비트 6개 → 16진 문자열) */
function packSet(set) {
  const words = new Array(6).fill(0);
  for (const k of set) words[k >> 5] |= 1 << (k & 31);
  return words.map((x) => (x >>> 0).toString(16).padStart(8, "0")).join("");
}

if (isMainThread) {
  const tasks = [];
  for (const mode of MODES) for (const S of STACKS) if (S > mode.ante) tasks.push({ mode: mode.key, S, ante: mode.ante });
  const n = Math.max(1, os.cpus().length - 1);
  const chunks = Array.from({ length: n }, (_, k) => tasks.filter((_, t) => t % n === k));
  const started = Date.now();
  Promise.all(chunks.map((chunk) => new Promise((resolve, reject) => {
    const worker = new Worker(__filename, { workerData: { inPath, tasks: chunk } });
    worker.on("message", resolve);
    worker.on("error", reject);
  }))).then((parts) => {
    const all = parts.flat();
    const out = { generatedFrom: `헤즈업 내시 · 승률표 ${data.samples}판 몬테카를로 · 0.1bb 간격`, names, stacks: STACKS, modes: {} };
    let worst = 0;
    for (const mode of MODES) {
      const rows = STACKS.map((S) => {
        const r = all.find((x) => x.mode === mode.key && x.S === S);
        if (!r) return null;
        worst = Math.max(worst, r.gain);
        return { s: S, push: packSet(r.pushSet), call: packSet(r.callSet), pushPct: Math.round(r.pushPct * 1000) / 10, callPct: Math.round(r.callPct * 1000) / 10 };
      });
      out.modes[mode.key] = { label: mode.label, ante: mode.ante, rows };
    }
    fs.writeFileSync(outPath, JSON.stringify(out));
    console.log(`끝 ${tasks.length}개 스택 · ${Math.round((Date.now() - started) / 1000)}초 · 한쪽만 바꿔 얻는 최대 이득 ${worst.toFixed(5)}bb → ${outPath}`);
  });
}
