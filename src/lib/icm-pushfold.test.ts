import assert from "node:assert/strict";
import fs from "node:fs";
import { describe, it } from "node:test";
import { solveIcmPushFold, type EqTable } from "./icm-pushfold";
import { ranking, topRange, HAND_NAMES } from "./hand-ranking";
import { classCombos, rangeEquity } from "./equity";
import { cardIndex } from "./hand-eval";

const table = JSON.parse(fs.readFileSync(new URL("../../public/data/preflop-eq.json", import.meta.url), "utf8")) as EqTable;

describe("ICM push/fold", () => {
  it("chip mode heads-up 10bb matches the heads-up Nash chart", async () => {
    const r = await solveIcmPushFold(table, { stacks: [10, 10], sb: 0.5, bb: 1, ante: 0, payouts: [1], pusher: 0, utility: "chips" }, 1500);
    assert.ok(Math.abs(r.pushPct - 58.4) <= 0.6, String(r.pushPct));
    assert.ok(Math.abs(r.calls[0].pct - 37.3) <= 0.6, String(r.calls[0].pct));
  });

  it("winner-take-all ICM equals chips heads-up", async () => {
    const a = await solveIcmPushFold(table, { stacks: [8, 12], sb: 0.5, bb: 1, ante: 0, payouts: [100], pusher: 0, utility: "icm" }, 1200);
    const b = await solveIcmPushFold(table, { stacks: [8, 12], sb: 0.5, bb: 1, ante: 0, payouts: [100], pusher: 0, utility: "chips" }, 1200);
    assert.equal(a.pushPct, b.pushPct);
    assert.equal(a.calls[0].pct, b.calls[0].pct);
  });

  it("on the bubble the caller tightens a lot", async () => {
    const spot = { stacks: [10, 10, 10, 10], sb: 0.5, bb: 1, ante: 0, payouts: [50, 30, 20], pusher: 1 };
    const icm = await solveIcmPushFold(table, { ...spot, utility: "icm" }, 800);
    const chips = await solveIcmPushFold(table, { ...spot, utility: "chips" }, 800);
    assert.ok(icm.calls.at(-1)!.pct < chips.calls.at(-1)!.pct - 8, `${icm.calls.at(-1)!.pct} vs ${chips.calls.at(-1)!.pct}`);
  });
});

describe("hand ranking and range equity", () => {
  it("AA first and 32o last against one opponent", () => {
    const r = ranking("1");
    assert.equal(HAND_NAMES[r.order[0]], "AA");
    assert.equal(HAND_NAMES[r.order[168]], "32o");
    assert.ok(Math.abs(r.equity[r.order[0]] - 0.852) < 0.005);
  });

  it("top 10% contains premiums and not trash", () => {
    const top = topRange(10);
    for (const h of ["AA", "KK", "AKs", "AKo"]) assert.ok(top.has(HAND_NAMES.indexOf(h)), h);
    assert.ok(!top.has(HAND_NAMES.indexOf("72o")));
  });

  it("AA vs a KK-only range is about 82%", async () => {
    const r = await rangeEquity([cardIndex("Ah"), cardIndex("As")], [], classCombos("KK"), 60_000);
    assert.ok(r && Math.abs(r.win + r.tie / 2 - 0.82) < 0.01, String(r?.win));
  });
});
