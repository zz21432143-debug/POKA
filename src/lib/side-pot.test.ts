import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { computePots, payouts } from "./side-pot";

const p = (name: string, amount: number, folded = false) => ({ name, amount, folded });

describe("side pot calculator", () => {
  it("splits main and side pots by all-in levels", () => {
    // A 1,000 올인 · B 3,000 올인 · C·D 5,000 콜
    const r = computePots([p("A", 1000), p("B", 3000), p("C", 5000), p("D", 5000)]);
    assert.deepEqual(r.pots, [
      { amount: 4000, eligible: [0, 1, 2, 3] },
      { amount: 6000, eligible: [1, 2, 3] },
      { amount: 4000, eligible: [2, 3] },
    ]);
    assert.equal(r.refund, null);
    assert.equal(r.total, 14000);
  });

  it("puts folded chips in the pots and returns an uncalled bet", () => {
    // E는 2,000 내고 폴드, D는 7,000 베팅했지만 C가 5,000까지만 콜 → D에게 2,000 돌려줌
    const r = computePots([p("A", 1000), p("B", 3000), p("C", 5000), p("D", 7000), p("E", 2000, true)]);
    assert.deepEqual(r.refund, { player: 3, amount: 2000 });
    assert.deepEqual(r.pots, [
      { amount: 5000, eligible: [0, 1, 2, 3] },
      { amount: 7000, eligible: [1, 2, 3] },
      { amount: 4000, eligible: [2, 3] },
    ]);
    assert.equal(r.pots.reduce((s, x) => s + x.amount, 0) + 2000, r.total);
  });

  it("merges pots with the same players and keeps folded excess in the last pot", () => {
    // B 2,000 올인 · C 3,000 베팅 후 A가 5,000으로 올리자 C 폴드
    // → A에게 2,000 돌려줌, 메인 6,000(A·B), 사이드 2,000(C가 더 낸 1,000 포함, A만)
    const r = computePots([p("A", 5000), p("B", 2000), p("C", 3000, true)]);
    assert.deepEqual(r.refund, { player: 0, amount: 2000 });
    assert.deepEqual(r.pots, [
      { amount: 6000, eligible: [0, 1] },
      { amount: 2000, eligible: [0] },
    ]);
    // 같은 사람끼리인 팟은 하나로
    const merged = computePots([p("A", 3000), p("B", 3000), p("C", 1000, true)]);
    assert.deepEqual(merged.pots, [{ amount: 7000, eligible: [0, 1] }]);
  });

  it("pays winners and splits ties with odd chips", () => {
    const players = [p("A", 1000), p("B", 3000), p("C", 5000), p("D", 5000)];
    const r = computePots(players);
    // 메인: A 승 · 사이드1: B·C 나눔 · 사이드2: D 승
    const { pay } = payouts(players, r, [[0], [1, 2], [3]]);
    assert.deepEqual(pay, [4000, 3000, 3000, 4000]);
    const odd = computePots([p("A", 1001), p("B", 1001), p("C", 1001)]);
    const res = payouts([p("A", 1001), p("B", 1001), p("C", 1001)], odd, [[0, 1]]);
    assert.deepEqual(res.pay, [1502, 1501, 0]);
    assert.equal(res.oddChips.length, 1);
  });
});

describe("practice problems", async () => {
  const { sidePotProblem, chipsProblem } = await import("./practice");
  // 같은 결과가 나오는 난수
  const seeded = (seed: number) => () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  it("side pot problems always have 2~4 real pots that add up", () => {
    const rand = seeded(7);
    for (let i = 0; i < 300; i += 1) {
      const { players, answer } = sidePotProblem(rand);
      assert.ok(answer.pots.length >= 2 && answer.pots.length <= 4);
      const sum = answer.pots.reduce((s, x) => s + x.amount, 0) + (answer.refund?.amount ?? 0);
      assert.equal(sum, players.reduce((s, p) => s + p.amount, 0));
    }
  });
  it("chip problems add up", () => {
    const rand = seeded(11);
    for (let i = 0; i < 100; i += 1) {
      const q = chipsProblem(rand);
      assert.ok(q.stacks.length >= 3 && q.stacks.length <= 4);
      assert.equal(q.answer, q.stacks.reduce((s, x) => s + x.value * x.count, 0));
    }
  });
});
