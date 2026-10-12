import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizeTime, parseDealerLines, planDealers, toDealerStatus, type RotationDealerView } from "./rotation";

const dealer = (over: Partial<RotationDealerView>): RotationDealerView => ({
  id: "x",
  name: "x",
  startTime: null,
  status: "WAIT",
  checkedInAt: null,
  leftAt: null,
  sort: 0,
  ...over,
});

describe("dealer rotation rules", () => {
  it("reads dealer lines with optional start time", () => {
    assert.deepEqual(parseDealerLines("김딜러 18:00\n이딜러 1930\n박딜러\n최딜러 7시"), [
      { name: "김딜러", startTime: "18:00" },
      { name: "이딜러", startTime: "19:30" },
      { name: "박딜러", startTime: null },
      { name: "최딜러", startTime: "07:00" },
    ]);
    assert.equal(normalizeTime("25:00"), null);
  });

  it("maps old statuses to the new ones", () => {
    assert.equal(toDealerStatus("WORKING"), "IN");
    assert.equal(toDealerStatus("BREAK"), "IN");
    assert.equal(toDealerStatus("OFF"), "OFF");
  });

  it("uses check-in time first, then planned start, skips day-off and ends at leave time", () => {
    const start = 600; // 10:00
    const list = planDealers(
      [
        dealer({ id: "a", startTime: "10:30" }),
        // 10:12 KST 출근 체크
        dealer({ id: "b", startTime: "10:00", status: "IN", checkedInAt: "2026-10-12T01:12:00.000Z" }),
        dealer({ id: "c", status: "OFF" }),
        dealer({ id: "d", status: "LEFT", checkedInAt: "2026-10-12T01:00:00.000Z", leftAt: "2026-10-12T03:00:00.000Z" }),
        dealer({ id: "e" }),
      ],
      start,
    );
    assert.deepEqual(list, [
      { id: "a", from: 630, to: null },
      { id: "b", from: 612, to: null },
      { id: "d", from: 600, to: 720 },
      { id: "e", from: 600, to: null },
    ]);
  });
});

describe("table numbers", async () => {
  const { parseTableLabels, formatTableLabels } = await import("./rotation");
  it("reads ranges and single numbers", () => {
    assert.deepEqual(parseTableLabels("5-8, 12 15").labels, [5, 6, 7, 8, 12, 15]);
    assert.deepEqual(parseTableLabels("3,3,1").labels, [3, 1]);
    assert.deepEqual(parseTableLabels("1-3, x").errors, ["x"]);
    assert.equal(formatTableLabels([5, 6, 7, 8, 12, 13, 20]), "5-8, 12, 13, 20");
  });
});
