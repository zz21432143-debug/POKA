import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { computePots, explainPots, payouts, potName } from "./side-pot";

const p = (name: string, amount: number, folded = false) => ({ name, amount, folded });
const simple = (r: ReturnType<typeof computePots>) => r.pots.map((x) => ({ amount: x.amount, eligible: x.eligible }));

describe("side pot calculator", () => {
  it("splits main and side pots by all-in levels", () => {
    // A 1,000 올인 · B 3,000 올인 · C·D 5,000 콜
    const r = computePots([p("A", 1000), p("B", 3000), p("C", 5000), p("D", 5000)]);
    assert.deepEqual(simple(r), [
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
    assert.deepEqual(simple(r), [
      { amount: 5000, eligible: [0, 1, 2, 3] },
      { amount: 7000, eligible: [1, 2, 3] },
      { amount: 4000, eligible: [2, 3] },
    ]);
  });

  it("keeps folded excess in the last pot and merges same-player pots", () => {
    // B 2,000 올인 · C 3,000 베팅 후 A가 5,000으로 올리자 C 폴드 → A에게 2,000 돌려줌
    const r = computePots([p("A", 5000), p("B", 2000), p("C", 3000, true)]);
    assert.deepEqual(r.refund, { player: 0, amount: 2000 });
    assert.deepEqual(simple(r), [
      { amount: 6000, eligible: [0, 1] },
      { amount: 2000, eligible: [0] },
    ]);
    const merged = computePots([p("A", 3000), p("B", 3000), p("C", 1000, true)]);
    assert.deepEqual(simple(merged), [{ amount: 7000, eligible: [0, 1] }]);
  });

  it("adds ante to the main pot and explains each pot", () => {
    const players = [p("SB", 500, true), p("BB", 4000), p("UTG", 10000), p("CO", 10000)];
    const r = computePots(players, { deadMain: 1000 });
    assert.deepEqual(simple(r), [
      { amount: 13500, eligible: [1, 2, 3] },
      { amount: 12000, eligible: [2, 3] },
    ]);
    assert.equal(r.total, 25500);
    const lines = explainPots(players, r);
    assert.match(lines[0], /^메인 팟 13,500 = SB\(폴드\) 500 \+ BB 4,000 \+ UTG 4,000 \+ CO 4,000 \+ 앤티 1,000/);
    assert.match(lines[1], /^세컨 팟 12,000 = UTG 6,000 \+ CO 6,000/);
    assert.deepEqual([0, 1, 2, 3, 4].map(potName), ["메인 팟", "세컨 팟", "서드 팟", "포스 팟", "피프스 팟"]);
  });

  it("pays winners and splits ties with odd chips", () => {
    const players = [p("A", 1000), p("B", 3000), p("C", 5000), p("D", 5000)];
    const r = computePots(players);
    const { pay } = payouts(players, r, [[0], [1, 2], [3]]);
    assert.deepEqual(pay, [4000, 3000, 3000, 4000]);
    const three = [p("A", 1001), p("B", 1001), p("C", 1001)];
    const res = payouts(three, computePots(three), [[0, 1]]);
    assert.deepEqual(res.pay, [1502, 1501, 0]);
    assert.equal(res.oddChips.length, 1);
  });
});

describe("pot practice problems", async () => {
  const { potProblem, positionNames, validBlinds, DIFFICULTY, DIFFICULTIES } = await import("./practice");
  const seeded = (seed: number) => () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  it("names positions from the button", () => {
    assert.deepEqual(positionNames(6), ["BTN", "SB", "BB", "UTG", "HJ", "CO"]);
    assert.deepEqual(positionNames(9), ["BTN", "SB", "BB", "UTG", "UTG+1", "MP", "LJ", "HJ", "CO"]);
  });
  for (const d of DIFFICULTIES) {
    it(`plays a real preflop round on 9 seats (${d})`, () => {
      const rand = seeded(d.length * 31 + 7);
      for (let i = 0; i < 60; i += 1) {
        const BLINDS = [{ sb: 500, bb: 1000 }, { sb: 1000, bb: 2000 }, { sb: 100, bb: 200 }, { sb: 300, bb: 600 }, { sb: 200, bb: 400 }];
        const blinds = { ...BLINDS[i % BLINDS.length], ante: 0 };
        const q = potProblem(d, blinds, rand);
        const [lo, hi] = DIFFICULTY[d].pots;
        assert.equal(q.seats.length, 9);
        assert.equal(q.seats[q.button].position, "BTN");
        assert.ok(q.answer.pots.length >= lo && q.answer.pots.length <= hi, `${d}: 팟 ${q.answer.pots.length}개`);
        assert.ok(q.answer.pots.every((pot) => pot.eligible.length >= 2));
        // 액션을 다시 돌리면 좌석마다 낸 금액과 같고, 금액은 줄지 않음
        const last = Array(9).fill(0);
        for (const a of q.actions) {
          if (a.type !== "ante") assert.ok(a.to >= last[a.seat]);
          last[a.seat] = a.to;
        }
        assert.deepEqual(last, q.seats.map((s) => s.amount));
        for (const s of q.seats) if (s.action === "fold") assert.ok(q.actions.some((a) => a.seat === s.seat && a.type === "fold"));
        const sum = q.answer.pots.reduce((t, x) => t + x.amount, 0) + (q.answer.refund?.amount ?? 0);
        // 앤티는 항상 BB 금액
        assert.equal(q.blinds.ante, blinds.bb);
        assert.equal(sum, q.seats.reduce((t, x) => t + x.amount, 0) + blinds.bb);
        if (d === "easy") assert.ok(!q.answer.refund && !q.seats.some((s) => s.note));
        // 칩은 100 단위: 스택 · 액션 · 팟 · 돌려줄 금액 모두
        const amounts = [...q.seats.map((s) => s.stack), ...q.actions.map((a) => a.to), ...q.answer.pots.map((x) => x.amount), q.answer.refund?.amount ?? 0];
        assert.ok(amounts.every((n) => n % 100 === 0), `${d} ${blinds.sb}/${blinds.bb}: 100 단위 아닌 금액 ${amounts.filter((n) => n % 100)}`);
      }
    });
  }
  it("rejects bad blinds", () => {
    assert.equal(validBlinds({ sb: 1000, bb: 500, ante: 0 }), false);
    assert.equal(validBlinds({ sb: 500, bb: 1000 }), true);
    // 100 단위만
    assert.equal(validBlinds({ sb: 50, bb: 100 }), false);
    assert.equal(validBlinds({ sb: 150, bb: 300 }), false);
    assert.equal(validBlinds({ sb: 100, bb: 200 }), true);
  });
});

describe("autoFillPot (팟 칸 하나만 비면 남은 금액 자동)", () => {
  it("fills whichever single pot is empty with the remainder", async () => {
    const { autoFillPot } = await import("./practice");
    const answer = computePots([
      { id: "a", amount: 1000 },
      { id: "b", amount: 3000 },
      { id: "c", amount: 6000 },
      { id: "d", amount: 6000 },
    ]);
    const amounts = answer.pots.map((p) => p.amount);
    assert.deepEqual(amounts, [4000, 6000, 6000]);
    // 사이드팟부터 잡으면 메인 팟이 자동
    assert.deepEqual(autoFillPot(["", "6,000", "6000"], answer), { index: 0, value: 4000 });
    // 메인부터 잡으면 마지막 팟이 자동
    assert.deepEqual(autoFillPot(["4000", "6000", ""], answer), { index: 2, value: 6000 });
    // 두 칸 이상 비었거나 다 찼으면 자동 없음
    assert.equal(autoFillPot(["4000", "", ""], answer), null);
    assert.equal(autoFillPot(["4000", "6000", "6000"], answer), null);
    // 너무 많이 적으면 0(틀린 답으로 처리)
    assert.deepEqual(autoFillPot(["", "9000", "9000"], answer), { index: 0, value: 0 });
  });
});
