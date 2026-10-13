/**
 * 사이드팟 계산(DB 없이 계산만).
 *
 * 1) 콜 받지 못한 금액 돌려주기: 가장 많이 낸 사람이 두 번째로 많이 낸 사람보다 더 낸 만큼은 본인에게 돌려줍니다.
 * 2) 폴드하지 않은 사람이 낸 금액을 낮은 순서대로 층(레벨)으로 나눠, 층마다 모든 사람이 그 층까지 낸 만큼 모아 팟을 만듭니다.
 *    그 팟을 가져갈 수 있는 사람 = 폴드하지 않았고 그 층 이상 낸 사람.
 *    참여자가 같은 이웃 팟은 하나로 합칩니다(메인 · 세컨 · 서드 · 포스 · 피프스 팟 …).
 * 3) 폴드한 사람이 맨 위 층보다 더 낸 돈은 마지막 팟에 들어갑니다(돌려받지 못함).
 * 4) 앤티(BB 앤티 등)는 누구 몫도 아닌 돈(데드 머니)이라 메인 팟에 더합니다.
 */

export type PotPlayer = {
  name: string;
  /** 이번 핸드에 낸 칩 합계(앤티 제외) */
  amount: number;
  folded: boolean;
};

/** 팟 하나: 금액 · 가져갈 수 있는 사람 · 사람마다 이 팟에 들어간 몫(풀이용) */
export type Pot = { amount: number; eligible: number[]; parts: { player: number; amount: number }[]; dead?: number };

export type PotResult = {
  pots: Pot[];
  /** 콜 받지 못해 돌려줄 금액 */
  refund: { player: number; amount: number } | null;
  /** 낸 돈 전체(앤티 포함) */
  total: number;
};

export function computePots(players: PotPlayer[], options: { deadMain?: number } = {}): PotResult {
  const contrib = players.map((p) => Math.max(0, Math.floor(Number(p.amount) || 0)));
  const dead = Math.max(0, Math.floor(Number(options.deadMain) || 0));
  const total = contrib.reduce((a, b) => a + b, 0) + dead;

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
  const live = players.map((_, i) => i).filter((i) => !players[i].folded && contrib[i] > 0);
  const levels = [...new Set(live.map((i) => contrib[i]))].sort((a, b) => a - b);
  const pots: Pot[] = [];
  let prev = 0;
  for (const level of levels) {
    const parts = contrib.map((c, i) => ({ player: i, amount: Math.min(c, level) - Math.min(c, prev) })).filter((x) => x.amount > 0);
    const amount = parts.reduce((s, x) => s + x.amount, 0);
    const eligible = live.filter((i) => contrib[i] >= level);
    const last = pots[pots.length - 1];
    if (last && last.eligible.join(",") === eligible.join(",")) {
      last.amount += amount;
      for (const x of parts) {
        const same = last.parts.find((y) => y.player === x.player);
        if (same) same.amount += x.amount;
        else last.parts.push({ ...x });
      }
    } else if (amount > 0) pots.push({ amount, eligible, parts });
    prev = level;
  }
  // 3) 폴드한 사람이 맨 위 층보다 더 낸 돈
  const extra = contrib.map((c, i) => ({ player: i, amount: players[i].folded ? Math.max(0, c - prev) : 0 })).filter((x) => x.amount > 0);
  if (extra.length) {
    if (!pots.length) pots.push({ amount: 0, eligible: [], parts: [] });
    const last = pots[pots.length - 1];
    for (const x of extra) {
      last.amount += x.amount;
      const same = last.parts.find((y) => y.player === x.player);
      if (same) same.amount += x.amount;
      else last.parts.push({ ...x });
    }
  }
  // 4) 앤티 → 메인 팟
  if (dead > 0) {
    if (!pots.length) pots.push({ amount: 0, eligible: [], parts: [] });
    pots[0].amount += dead;
    pots[0].dead = dead;
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

const POT_NAMES = ["메인 팟", "세컨 팟", "서드 팟", "포스 팟", "피프스 팟"];
/** "메인 팟", "세컨 팟", "서드 팟", "포스 팟", "피프스 팟" … */
export const potName = (index: number) => POT_NAMES[index] ?? `${index + 1}번째 팟`;

const won = (n: number) => Math.round(n).toLocaleString("ko-KR");

/** 풀이: 팟마다 누가 얼마 넣었는지, 앤티·돌려줄 금액까지 한 줄씩 */
export function explainPots(players: PotPlayer[], result: PotResult) {
  const lines: string[] = [];
  if (result.refund) {
    lines.push(`① ${players[result.refund.player].name}이(가) 다른 사람보다 ${won(result.refund.amount)} 더 냈고 아무도 받지 못했으니 먼저 돌려줍니다.`);
  }
  result.pots.forEach((pot, index) => {
    const parts = pot.parts.map((x) => `${players[x.player].name}${players[x.player].folded ? "(폴드)" : ""} ${won(x.amount)}`).join(" + ");
    const dead = pot.dead ? ` + 앤티 ${won(pot.dead)}` : "";
    const who = pot.eligible.map((i) => players[i].name).join(", ");
    lines.push(`${potName(index)} ${won(pot.amount)} = ${parts}${dead}  →  가져갈 수 있는 사람: ${who || "없음"}`);
  });
  return lines;
}
