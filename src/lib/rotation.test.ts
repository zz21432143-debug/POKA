import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { dealerSegments, dealerTotals, formatDuration, normalizeTime, parseDealerLines, type RotationEventView } from "./rotation";

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

  it("totals work and break time from the day's events", () => {
    const t0 = Date.UTC(2026, 9, 12, 9, 0);
    const min = 60_000;
    const events: RotationEventView[] = [
      { dealerId: "a", status: "WORKING", tableNo: 3, at: new Date(t0).toISOString() },
      { dealerId: "a", status: "BREAK", tableNo: null, at: new Date(t0 + 40 * min).toISOString() },
      { dealerId: "a", status: "WORKING", tableNo: 5, at: new Date(t0 + 55 * min).toISOString() },
      { dealerId: "b", status: "WORKING", tableNo: 1, at: new Date(t0).toISOString() },
    ];
    const segments = dealerSegments(events, "a", t0 + 90 * min, t0);
    assert.deepEqual(segments.map((s) => [s.status, s.tableNo]), [["WORKING", 3], ["BREAK", null], ["WORKING", 5]]);
    const totals = dealerTotals(segments);
    assert.equal(formatDuration(totals.work), "1:15");
    assert.equal(formatDuration(totals.rest), "0:15");
  });

  it("ignores time before the work day started", () => {
    const t0 = Date.UTC(2026, 9, 12, 9, 0);
    const events: RotationEventView[] = [{ dealerId: "a", status: "WORKING", tableNo: 1, at: new Date(t0 - 3_600_000).toISOString() }];
    const totals = dealerTotals(dealerSegments(events, "a", t0 + 600_000, t0));
    assert.equal(formatDuration(totals.work), "0:10");
  });
});
