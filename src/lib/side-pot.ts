/**
 * 사이드팟 계산(DB 없이 계산만).
 *
 * 1) 콜 받지 못한 금액 돌려주기: 가장 많이 낸 사람이 두 번째로 많이 낸 사람보다 더 낸 만큼은 본인에게 돌려줍니다.
 * 2) 폴드하지 않은 사람이 낸 금액을 낮은 순서대로 층(레벨)으로 나눠, 층마다 모든 사람이 그 층까지 낸 만큼 모아 팟을 만듭니다.
 *    그 팟을 가져갈 수 있는 사람 = 폴드하지 않았고 그 층 이상 낸 사람.
 *    참여자가 같은 이웃 팟은 하나로 합칩니다(메인팟 · 사이드팟1 · 사이드팟2 …).
 * 3) 폴드한 사람이 맨 위 층보다 더 낸 돈은 마지막 팟에 들어갑니다(돌려받지 못함).
 */

export type PotPlayer = {
  name: string;
  /** 이번 핸드에 낸 칩 합계 */
  amount: number;
  folded: boolean;
};

export type Pot = { amount: number; eligible: number[] };

export type PotResult = {
  pots: Pot[];
  /** 콜 받지 못해 돌려줄 금액 */
  refund: { player: number; amount: number } | null;
  total: number;
};

export function computePots(players: PotPlayer[]): PotResult {
  const contrib = players.map((p) => Math.max(0, Math.floor(Number(p.amount) || 0)));
  const total = contrib.reduce((a, b) => a + b, 0);

  // 1) 돌려줄 금액
  let refund: PotResult["refund"] = null;
  const order = contrib.map((c, i) => ({ c, i })).sort((a, b) => b.c - a.c);
  if (order.length >= 2 && order[0].c > order[1].c) {
    refund = { player: order[0].i, amount: order[0].c - order[1].c };
    contrib[order[0].i] = order[1].c;
  } else if (order.length === 1 && order[0].c > 0) {
    refund = { player: order[0].i, amount: order[0].c };
    contrib[order[0].i] = 0;
  }

  // 2) 층별 팟
  const live = players.map((p, i) => i).filter((i) => !players[i].folded && contrib[i] > 0);
  const levels = [...new Set(live.map((i) => contrib[i]))].sort((a, b) => a - b);
  const pots: Pot[] = [];
  let prev = 0;
  for (const level of levels) {
    const amount = contrib.reduce((sum, c) => sum + (Math.min(c, level) - Math.min(c, prev)), 0);
    const eligible = live.filter((i) => contrib[i] >= level);
    const last = pots[pots.length - 1];
    if (last && last.eligible.join(",") === eligible.join(",")) last.amount += amount;
    else if (amount > 0) pots.push({ amount, eligible });
    prev = level;
  }
  // 3) 폴드한 사람이 맨 위 층보다 더 낸 돈
  const extra = contrib.reduce((sum, c, i) => sum + (players[i].folded ? Math.max(0, c - prev) : 0), 0);
  if (extra > 0) {
    if (pots.length) pots[pots.length - 1].amount += extra;
    else pots.push({ amount: extra, eligible: [] });
  }
  return { pots, refund, total };
}

/**
 * 팟마다 이긴 사람(여럿이면 나눠 갖기)으로 받을 금액 계산.
 * 나누어떨어지지 않는 칩(odd chip)은 앞자리(목록 순서) 사람부터 1씩 — 실제로는 버튼 왼쪽부터 줍니다.
 */
export function payouts(players: PotPlayer[], result: PotResult, winners: number[][]) {
  const pay = players.map(() => 0);
  const oddChips: { pot: number; player: number; amount: number }[] = [];
  result.pots.forEach((pot, index) => {
    const win = (winners[index] ?? []).filter((i) => pot.eligible.includes(i)).sort((a, b) => a - b);
    if (!win.length) return;
    const share = Math.floor(pot.amount / win.length);
    let rest = pot.amount - share * win.length;
    for (const i of win) {
      pay[i] += share;
      if (rest > 0) {
        pay[i] += 1;
        oddChips.push({ pot: index, player: i, amount: 1 });
        rest -= 1;
      }
    }
  });
  if (result.refund) pay[result.refund.player] += result.refund.amount;
  return { pay, oddChips };
}

/** "메인팟", "사이드팟 1" … */
export const potName = (index: number) => (index === 0 ? "메인팟" : `사이드팟 ${index}`);
