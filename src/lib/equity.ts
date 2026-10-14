import { evalCards, handName } from "@/lib/hand-eval";

export type EquityResult = { win: number; tie: number; lose: number; samples: number; exact: boolean };

/**
 * 내 패 vs 상대 패(둘 다 정해짐) 승률. 남은 보드를 전부 따져 정확히 계산합니다.
 * 프리플랍(보드 0장)은 171만 가지라 조금 걸리므로, onProgress로 진행을 알려 주고 중간중간 쉬어 갑니다.
 */
export async function exactEquity(hero: number[], villain: number[], board: number[], onProgress?: (done: number) => void): Promise<EquityResult> {
  const used = new Set([...hero, ...villain, ...board]);
  const deck: number[] = [];
  for (let c = 0; c < 52; c++) if (!used.has(c)) deck.push(c);
  const need = 5 - board.length;
  const h = new Int32Array(7);
  const v = new Int32Array(7);
  h[0] = hero[0];
  h[1] = hero[1];
  v[0] = villain[0];
  v[1] = villain[1];
  for (let i = 0; i < board.length; i++) h[2 + i] = v[2 + i] = board[i];
  let win = 0;
  let tie = 0;
  let total = 0;
  const n = deck.length;
  const idx = [0, 0, 0, 0, 0];
  const base = 2 + board.length;
  // need장 고르기(사전 순서). 1만 판마다 잠깐 쉼(화면이 멈추지 않게)
  const visit = () => {
    for (let k = 0; k < need; k++) h[base + k] = v[base + k] = deck[idx[k]];
    const a = evalCards(h);
    const b = evalCards(v);
    if (a > b) win++;
    else if (a === b) tie++;
    total++;
  };
  if (need === 0) {
    visit();
  } else {
    for (let k = 0; k < need; k++) idx[k] = k;
    let counter = 0;
    for (;;) {
      visit();
      if (++counter % 50000 === 0) {
        onProgress?.(counter);
        await new Promise((r) => setTimeout(r, 0));
      }
      let k = need - 1;
      while (k >= 0 && idx[k] === n - need + k) k--;
      if (k < 0) break;
      idx[k]++;
      for (let j = k + 1; j < need; j++) idx[j] = idx[j - 1] + 1;
    }
  }
  return { win: win / total, tie: tie / total, lose: (total - win - tie) / total, samples: total, exact: true };
}

/** 상대 패를 모를 때(아무 패): 상대 패와 남은 보드를 무작위로 뽑아 계산(몬테카를로) */
export async function randomEquity(hero: number[], board: number[], samples = 200_000, onProgress?: (done: number) => void): Promise<EquityResult> {
  const used = new Set([...hero, ...board]);
  const deck: number[] = [];
  for (let c = 0; c < 52; c++) if (!used.has(c)) deck.push(c);
  const n = deck.length;
  const need = 5 - board.length;
  const h = new Int32Array(7);
  const v = new Int32Array(7);
  h[0] = hero[0];
  h[1] = hero[1];
  for (let i = 0; i < board.length; i++) h[2 + i] = v[2 + i] = board[i];
  const work = deck.slice();
  let win = 0;
  let tie = 0;
  for (let t = 0; t < samples; t++) {
    // 상대 2장 + 보드 need장
    for (let k = 0; k < 2 + need; k++) {
      const r = k + Math.floor(Math.random() * (n - k));
      const tmp = work[k];
      work[k] = work[r];
      work[r] = tmp;
    }
    v[0] = work[0];
    v[1] = work[1];
    for (let k = 0; k < need; k++) h[2 + board.length + k] = v[2 + board.length + k] = work[2 + k];
    const a = evalCards(h);
    const b = evalCards(v);
    if (a > b) win++;
    else if (a === b) tie++;
    if ((t + 1) % 50000 === 0) {
      onProgress?.(t + 1);
      await new Promise((r) => setTimeout(r, 0));
    }
  }
  return { win: win / samples, tie: tie / samples, lose: (samples - win - tie) / samples, samples, exact: false };
}

/** 지금 보드에서 내 패 족보 이름(보드 3장 이상일 때) */
export function madeHand(hole: number[], board: number[]) {
  if (board.length < 3) return null;
  return handName(evalCards([...hole, ...board]));
}

/** 콜에 필요한 승률: 상대 베팅 b, 베팅 전 팟 p → b / (p + 2b) */
export function requiredEquity(pot: number, bet: number) {
  if (!(bet > 0) || !(pot >= 0)) return null;
  return bet / (pot + 2 * bet);
}
