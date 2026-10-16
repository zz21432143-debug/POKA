import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { lineDate, splitPastScheduleLines } from "./job-dates";

describe("job schedule dates", () => {
  it("reads Korean and slash dates with the nearest year", () => {
    assert.equal(lineDate("10월 18일 (일) PM 2:00 - 2명", "2026-10-16"), "2026-10-18");
    assert.equal(lineDate("10/24(토) 6시 1명", "2026-10-16"), "2026-10-24");
    assert.equal(lineDate("1월 3일 (토) 오후", "2026-12-20"), "2027-01-03");
    assert.equal(lineDate("12월 28일", "2027-01-05"), "2026-12-28");
    assert.equal(lineDate("시급 20,000 (5시간 보장)", "2026-10-16"), null);
    assert.equal(lineDate("010 5886 2226", "2026-10-16"), null);
  });

  it("splits past schedule lines out of the body", () => {
    const text = "• 잠실 방이점\n10월 15일 (목) PM 2:00 - 2명\n10월 18일 (일) PM 2:00 - 2명\n\n시급 20,000";
    const r = splitPastScheduleLines(text, "2026-10-16");
    assert.deepEqual(r.past, ["10월 15일 (목) PM 2:00 - 2명"]);
    assert.ok(r.current.includes("10월 18일"));
    assert.ok(r.current.includes("시급 20,000"));
    assert.ok(!r.current.includes("10월 15일"));
  });
});
