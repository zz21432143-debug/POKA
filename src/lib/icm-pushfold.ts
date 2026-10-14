import { icmEquity } from "@/lib/icm";

/**
 * ICM 푸시/폴드(버블 · 파이널 테이블): 칩 대신 "상금 가치(ICM)"로 손익을 따져 먼저 올인하는 자리와 뒤 자리 전원의 균형을 구합니다.
 * - 스택이 서로 달라도 됨(유효 스택은 둘 중 작은 쪽)
 * - 한 명이 콜하면 나머지는 폴드(포지션 차트와 같은 근사)
 * - 폴드한 사람의 가치: 올인한 사람이 블라인드를 가져간 뒤의 ICM으로 근사
 * 승률표: public/data/preflop-eq.json(169×169, 쌍마다 30만 판)
 */
export type EqTable = { names: string[]; eq: number[]; w: number[] };

export type IcmSpot = {
  /** 행동 순서대로 스택(칩). 마지막 두 자리가 SB · BB */
  stacks: number[];
  sb: number;
  bb: number;
  /** BB가 내는 앤티(0이면 없음) */
  ante: number;
  /** 남은 순위별 상금(1위부터) */
  payouts: number[];
  /** 먼저 올인하는 자리 번호(0 = 첫 자리) */
  pusher: number;
  /** "icm" = 상금 가치, "chips" = 칩 기준 */
  utility: "icm" | "chips";
};

export type IcmResult = {
  push: Set<number>;
  calls: { seat: number; set: Set<number>; pct: number }[];
  pushPct: number;
};

const N = 169;
const combosOf = (name: string) => (name.length === 2 ? 6 : name.endsWith("s") ? 4 : 12);

export async function solveIcmPushFold(table: EqTable, spot: IcmSpot, iterations = 900, onProgress?: (done: number) => void): Promise<IcmResult> {
  const { stacks, sb: sbAmt, bb: bbAmt, ante, payouts, pusher: p } = spot;
  const n = stacks.length;
  const sbSeat = n >= 3 ? n - 2 : 0;
  const bbSeat = n - 1;
  const posted = stacks.map((s, i) => Math.min(s, (i === sbSeat ? sbAmt : 0) + (i === bbSeat ? bbAmt + ante : 0)));
  const value = (vec: number[]) => (spot.utility === "chips" ? vec : icmEquity(vec, payouts).equity);

  // 결과별 스택 → 가치
  const allFold = stacks.map((s, i) => s - posted[i]);
  const deadAll = posted.reduce((a, b) => a + b, 0);
  allFold[p] = stacks[p] - posted[p] + deadAll;
  const uAllFold = value(allFold);
  // 올인한 사람이 폴드: BB가 블라인드를 가져간다고 봄
  const foldVec = stacks.map((s, i) => s - posted[i]);
  foldVec[bbSeat] += deadAll;
  const uFold = value(foldVec);

  const callers: number[] = [];
  for (let k = p + 1; k < n; k++) callers.push(k);
  const outcomes = callers.map((k) => {
    const pushAmt = stacks[p];
    const callAvail = stacks[k] - (k === bbSeat ? ante : 0);
    const E = Math.min(pushAmt, callAvail);
    // 두 사람 말고 다른 자리가 낸 블라인드 · 앤티(죽은 돈) + 콜러가 BB면 그 앤티
    let dead = 0;
    for (let i = 0; i < n; i++) if (i !== p && i !== k) dead += posted[i];
    if (k === bbSeat) dead += ante;
    const pot = 2 * E + dead;
    const base = stacks.map((s, i) => (i === p || i === k ? s : s - posted[i]));
    const win = base.slice();
    win[p] = stacks[p] - E + pot;
    win[k] = stacks[k] - E - (k === bbSeat ? ante : 0);
    const lose = base.slice();
    lose[p] = stacks[p] - E;
    lose[k] = stacks[k] - E - (k === bbSeat ? ante : 0) + pot;
    const uWin = value(win);
    const uLose = value(lose);
    return { k, uWin, uLose };
  });

  const eq = table.eq;
  const w = table.w;
  const K = callers.length;
  const push = new Float64Array(N).fill(1);
  const call = callers.map(() => new Float64Array(N).fill(0.3));
  const q = callers.map(() => new Float64Array(N));
  const eqv = callers.map(() => new Float64Array(N));
  const reach = callers.map(() => new Float64Array(N));
  const brPush = new Float64Array(N);
  const brCall = callers.map(() => new Float64Array(N));

  const refresh = () => {
    for (let c = 0; c < K; c++) {
      const cv = call[c];
      for (let h = 0; h < N; h++) {
        let den = 0;
        let num = 0;
        let es = 0;
        const row = h * N;
        for (let x = 0; x < N; x++) {
          const ww = w[row + x];
          if (!ww) continue;
          den += ww;
          const v = ww * cv[x];
          num += v;
          es += v * eq[row + x];
        }
        q[c][h] = den ? num / den : 0;
        eqv[c][h] = num ? es / num / 10000 : 0;
      }
    }
    for (let h = 0; h < N; h++) {
      let r = 1;
      for (let c = 0; c < K; c++) {
        reach[c][h] = r;
        r *= 1 - q[c][h];
      }
    }
  };

  for (let t = 1; t <= iterations; t++) {
    refresh();
    for (let h = 0; h < N; h++) {
      let ev = 0;
      let none = 1;
      for (let c = 0; c < K; c++) {
        const o = outcomes[c];
        const pr = reach[c][h] * q[c][h];
        ev += pr * (eqv[c][h] * o.uWin[p] + (1 - eqv[c][h]) * o.uLose[p]);
        none *= 1 - q[c][h];
      }
      ev += none * uAllFold[p];
      brPush[h] = ev > uFold[p] ? 1 : 0;
    }
    for (let c = 0; c < K; c++) {
      const o = outcomes[c];
      const k = o.k;
      for (let x = 0; x < N; x++) {
        let num = 0;
        let den = 0;
        const row = x * N;
        for (let h = 0; h < N; h++) {
          const weight = w[row + h] * push[h] * reach[c][h];
          if (!weight) continue;
          const e = eq[h * N + x] / 10000; // 올인한 사람(h) 승률
          num += weight * (e * o.uWin[k] + (1 - e) * o.uLose[k]);
          den += weight;
        }
        brCall[c][x] = den > 0 && num / den > uAllFold[k] ? 1 : 0;
      }
    }
    const step = 1 / (t + 1);
    for (let h = 0; h < N; h++) push[h] += (brPush[h] - push[h]) * step;
    for (let c = 0; c < K; c++) for (let x = 0; x < N; x++) call[c][x] += (brCall[c][x] - call[c][x]) * step;
    if (t % 25 === 0) {
      onProgress?.(t / iterations);
      await new Promise((r) => setTimeout(r, 0));
    }
  }
  const toSet = (v: Float64Array) => {
    const s = new Set<number>();
    for (let h = 0; h < N; h++) if (v[h] >= 0.5) s.add(h);
    return s;
  };
  const pct = (s: Set<number>) => Math.round(([...s].reduce((sum, h) => sum + combosOf(table.names[h]), 0) / 1326) * 1000) / 10;
  const pushSet = toSet(push);
  return { push: pushSet, pushPct: pct(pushSet), calls: callers.map((k, c) => ({ seat: k, set: toSet(call[c]), pct: pct(toSet(call[c])) })) };
}

/** n명 테이블 자리 이름(행동 순서) */
export function seatNames(n: number): string[] {
  if (n === 2) return ["SB", "BB"];
  if (n === 6) return ["UTG", "HJ", "CO", "BTN", "SB", "BB"];
  const nine = ["UTG", "UTG+1", "MP", "LJ", "HJ", "CO", "BTN", "SB", "BB"];
  return nine.slice(9 - n);
}
