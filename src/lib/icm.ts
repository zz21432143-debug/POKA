/**
 * ICM(Independent Chip Model) 계산 — Malmuth-Harville 방식.
 * 칩이 많을수록 높은 순위로 끝날 확률이 칩 비율만큼이라고 보고, 각 순위 확률 × 상금을 더해 "상금 가치(에퀴티)"를 구합니다.
 * 이미 순위가 정해진 사람들의 집합(비트마스크)으로 확률을 쌓아 가므로 15명까지 바로 계산됩니다.
 */
export const ICM_MAX_PLAYERS = 15;

export type IcmResult = {
  /** 사람마다 상금 가치 */
  equity: number[];
  /** finish[i][p] = i번 사람이 p+1위로 끝날 확률 */
  finish: number[][];
};

export function icmEquity(stacks: number[], payouts: number[]): IcmResult {
  const n = stacks.length;
  if (n === 0) return { equity: [], finish: [] };
  if (n > ICM_MAX_PLAYERS) throw new Error(`ICM은 ${ICM_MAX_PLAYERS}명까지 계산할 수 있습니다.`);
  const chips = stacks.map((s) => (Number.isFinite(s) && s > 0 ? s : 0));
  const total = chips.reduce((a, b) => a + b, 0);
  const places = Math.min(n, payouts.length);
  const finish = Array.from({ length: n }, () => new Array<number>(n).fill(0));
  if (total <= 0) return { equity: new Array(n).fill(0), finish };

  // prob[mask] = mask에 든 사람들이 1위~|mask|위를 (어떤 순서로든) 차지할 확률
  const size = 1 << n;
  const prob = new Float64Array(size);
  const used = new Float64Array(size); // mask에 든 사람들의 칩 합
  prob[0] = 1;
  for (let mask = 0; mask < size; mask++) {
    const p = prob[mask];
    if (p === 0) continue;
    let placed = 0;
    for (let m = mask; m; m &= m - 1) placed++;
    // 상금 받는 순위가 다 정해졌으면 더 볼 필요 없음
    if (placed >= places) continue;
    const left = total - used[mask];
    if (left <= 0) continue;
    for (let i = 0; i < n; i++) {
      if (mask & (1 << i) || chips[i] === 0) continue;
      const q = p * (chips[i] / left);
      finish[i][placed] += q;
      const next = mask | (1 << i);
      if (prob[next] === 0) used[next] = used[mask] + chips[i];
      prob[next] += q;
    }
  }
  const equity = finish.map((row) => row.reduce((sum, pr, place) => sum + pr * (payouts[place] ?? 0), 0));
  return { equity, finish };
}

/** 칩 비율대로 나누는 딜(칩 촙): 남은 상금 합을 칩 비율로 */
export function chipChop(stacks: number[], payouts: number[]) {
  const total = stacks.reduce((a, b) => a + Math.max(0, b), 0);
  const pool = payouts.slice(0, stacks.length).reduce((a, b) => a + b, 0);
  return stacks.map((s) => (total > 0 ? (Math.max(0, s) / total) * pool : 0));
}

/** "1,000만", "300만원", "1.5억", "250000" → 숫자 */
export function parseAmount(raw: string): number {
  const text = raw.replace(/[,\s원]/g, "");
  if (!text) return 0;
  const m = /^(\d+(?:\.\d+)?)(억|천만|백만|만|천)?$/.exec(text);
  if (!m) return Number.NaN;
  const unit = { 억: 1e8, 천만: 1e7, 백만: 1e6, 만: 1e4, 천: 1e3 }[m[2] ?? ""] ?? 1;
  return Math.round(Number(m[1]) * unit);
}
