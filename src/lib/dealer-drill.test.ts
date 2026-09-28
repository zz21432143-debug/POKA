import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { computeSidePots, gradeSidePot } from "./dealer-pots";
import { minRaiseTo } from "./dealer-raise";

describe("dealer drills", () => {
  it("builds main and side pots and ignores uncalled chips", () => {
    const pots = computeSidePots([
      { seat: "A", stack: 200 },
      { seat: "B", stack: 500 },
      { seat: "C", stack: 1000 },
    ]);
    assert.deepEqual(
      pots.map((row) => [row.name, row.amount, row.seats.join("+")]),
      [
        ["메인팟", 600, "A+B+C"],
        ["사이드팟 1", 600, "B+C"],
      ],
    );
    assert.equal(gradeSidePot(pots, [600, 600]), true);
    assert.equal(gradeSidePot(pots, [600, 500]), false);
  });

  it("computes NL minimum raise-to", () => {
    assert.equal(minRaiseTo(100, 100), 200);
    assert.equal(minRaiseTo(300, 200), 500);
    assert.equal(minRaiseTo(400, 400), 800);
  });
});
