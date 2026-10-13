import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { kstDateAt, normalizeTime, parseDealerLines, planDealers, toDealerStatus, type RotationDealerView } from "./rotation";

const dealer = (over: Partial<RotationDealerView>): RotationDealerView => ({
  id: "x",
  name: "x",
  startTime: null,
  endTime: null,
  status: "WAIT",
  checkedInAt: null,
  leftAt: null,
  sort: 0,
  ...over,
});

describe("dealer rotation rules", () => {
  it("reads dealer lines with optional start time", () => {
    assert.deepEqual(parseDealerLines("김딜러 18:00\n이딜러 1930\n박딜러\n최딜러 7시"), [
      { name: "김딜러", startTime: "18:00", endTime: null },
      { name: "이딜러", startTime: "19:30", endTime: null },
      { name: "박딜러", startTime: null, endTime: null },
      { name: "최딜러", startTime: "07:00", endTime: null },
    ]);
    assert.deepEqual(parseDealerLines("김딜러 18:00-02:00\n이딜러 10시~18시"), [
      { name: "김딜러", startTime: "18:00", endTime: "02:00" },
      { name: "이딜러", startTime: "10:00", endTime: "18:00" },
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

  it("stops planning at the planned leave time, across midnight too", () => {
    const list = planDealers([dealer({ id: "a", startTime: "18:00", endTime: "02:00" }), dealer({ id: "b", startTime: "18:00", endTime: "22:00" })], 1080);
    assert.deepEqual(list, [
      { id: "a", from: 1080, to: 1560 },
      { id: "b", from: 1080, to: 1320 },
    ]);
  });

  it("turns a KST clock into the nearest date (overnight)", () => {
    // 2026-10-12 23:50 KST 근처에서 00:10 → 다음 날 00:10 KST
    const near = new Date("2026-10-12T14:50:00.000Z");
    assert.equal(kstDateAt("00:10", near).toISOString(), "2026-10-12T15:10:00.000Z");
    assert.equal(kstDateAt("23:00", near).toISOString(), "2026-10-12T14:00:00.000Z");
  });
});

describe("leaving dealers", () => {
  it("never puts a dealer who left back into the timetable (overnight or left before the shift)", () => {
    const list = planDealers(
      [
        // 23:40 출근 → 02:10 퇴근(밤샘)
        dealer({ id: "night", status: "LEFT", checkedInAt: "2026-10-12T14:40:00.000Z", leftAt: "2026-10-12T17:10:00.000Z" }),
        // 예정 18:00인데 17:50에 퇴근 처리(안 옴)
        dealer({ id: "early", status: "LEFT", startTime: "18:00", leftAt: "2026-10-12T08:50:00.000Z" }),
        // 퇴근 시각 없이 퇴근 상태
        dealer({ id: "none", status: "LEFT", startTime: "18:00" }),
      ],
      1380,
    );
    assert.deepEqual(list, [
      { id: "night", from: 1420, to: 1570 },
      { id: "early", from: 1080, to: 1080 },
      { id: "none", from: 1080, to: 1080 },
    ]);
  });
});
