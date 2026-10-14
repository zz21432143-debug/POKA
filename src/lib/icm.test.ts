import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { chipChop, icmEquity, parseAmount } from "./icm";

const close = (a: number, b: number, eps = 0.01) => assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`);

describe("ICM", () => {
  it("equal stacks split the prize pool equally", () => {
    const { equity } = icmEquity([1000, 1000, 1000], [50, 30, 20]);
    for (const e of equity) close(e, 100 / 3);
  });

  it("matches the textbook 3-player example", () => {
    // 칩 5000/3000/2000, 상금 50/30/20 → 38.39 / 32.75 / 28.86 (손 계산: B = 0.3×50 + 0.375×30 + 0.325×20)
    const { equity } = icmEquity([5000, 3000, 2000], [50, 30, 20]);
    close(equity[0], 38.393, 0.01);
    close(equity[1], 32.75, 0.01);
    close(equity[2], 28.857, 0.01);
    close(equity.reduce((a, b) => a + b, 0), 100);
  });

  it("each player's finish probabilities add up to 1 when all places pay", () => {
    const { finish } = icmEquity([1200, 800, 500, 300], [40, 30, 20, 10]);
    for (const row of finish) close(row.reduce((a, b) => a + b, 0), 1, 1e-9);
  });

  it("heads-up equity is linear in chips", () => {
    const { equity } = icmEquity([3000, 1000], [70, 30]);
    close(equity[0], 30 + 40 * 0.75);
    close(equity[1], 30 + 40 * 0.25);
  });

  it("fewer paid places than players and a busted stack", () => {
    const { equity } = icmEquity([5000, 3000, 2000, 0], [60, 40]);
    close(equity.reduce((a, b) => a + b, 0), 100);
    assert.equal(equity[3], 0);
  });

  it("handles 12 players quickly", () => {
    const stacks = Array.from({ length: 12 }, (_, i) => 1000 + i * 250);
    const payouts = [30, 20, 14, 10, 8, 6, 5, 4, 3];
    const t = Date.now();
    const { equity } = icmEquity(stacks, payouts);
    assert.ok(Date.now() - t < 2000);
    close(equity.reduce((a, b) => a + b, 0), 100, 1e-6);
  });

  it("chip chop and amount parsing", () => {
    const c = chipChop([3000, 1000], [70, 30]);
    close(c[0], 75);
    assert.equal(parseAmount("1,000만"), 10_000_000);
    assert.equal(parseAmount("1.5억"), 150_000_000);
    assert.equal(parseAmount("300만원"), 3_000_000);
    assert.equal(parseAmount("250000"), 250_000);
    assert.ok(Number.isNaN(parseAmount("abc")));
  });
});
