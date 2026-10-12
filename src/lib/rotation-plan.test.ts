import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { alignToStart, buildPlan, dealerSchedule, formatClock, parseClock, slotIndexAt, swapInSlot, type PlanDealer } from "./rotation-plan";

const dealers = (n: number, from = 600): PlanDealer[] => Array.from({ length: n }, (_, i) => ({ id: `d${i + 1}`, from, to: null }));

describe("rotation timetable", () => {
  it("reads and prints clock times, overnight aware", () => {
    assert.equal(parseClock("10:00"), 600);
    assert.equal(parseClock("25:00"), null);
    assert.equal(formatClock(1500), "01:00");
    assert.equal(alignToStart(60, 1200), 1500);
    assert.equal(alignToStart(1230, 1200), 1230);
  });

  it("makes 20-minute slots from start to end and fills every table", () => {
    const plan = buildPlan({ dealers: dealers(6), tables: 5, start: 600, end: 720, interval: 20 });
    assert.deepEqual(plan.slots.map((s) => formatClock(s.at)), ["10:00", "10:20", "10:40", "11:00", "11:20", "11:40"]);
    for (const slot of plan.slots) {
      assert.equal(slot.seats.filter(Boolean).length, 5);
      assert.equal(slot.rest.length, 1);
      assert.equal(new Set([...slot.seats, ...slot.rest]).size, 6);
    }
  });

  it("rotates breaks fairly and moves working dealers to the next table", () => {
    // 테이블 4개, 딜러 6명 → 매 칸 2명 휴식, 2칸 일하고 1칸 쉬는 흐름
    const plan = buildPlan({ dealers: dealers(6), tables: 4, start: 600, end: 600 + 20 * 12, interval: 20 });
    const work = new Map<string, number>();
    for (const slot of plan.slots) for (const id of slot.seats) if (id) work.set(id, (work.get(id) ?? 0) + 1);
    const counts = [...work.values()];
    assert.ok(Math.max(...counts) - Math.min(...counts) <= 1, String(counts));
    // 아무도 3칸 넘게 연속으로 일하지 않음
    for (const d of dealers(6)) {
      const run = dealerSchedule(plan, d.id).map((x) => (x.table ? "W" : "R")).join("");
      assert.ok(!run.includes("WWW"), `${d.id}: ${run}`);
    }
    // 이어서 일한 딜러는 다음 테이블로
    const s0 = plan.slots[0];
    const s1 = plan.slots[1];
    s0.seats.forEach((id, t) => {
      const next = s1.seats.indexOf(id);
      if (id && next >= 0) assert.equal(next, (t + 1) % 4);
    });
  });

  it("only uses dealers after they check in and before they leave", () => {
    const list: PlanDealer[] = [...dealers(4), { id: "late", from: 640, to: null }, { id: "early", from: 600, to: 660 }];
    const plan = buildPlan({ dealers: list, tables: 4, start: 600, end: 720, interval: 20 });
    for (const slot of plan.slots) {
      const all = [...slot.seats, ...slot.rest];
      if (slot.at < 640) assert.ok(!all.includes("late"));
      if (slot.at >= 660) assert.ok(!all.includes("early"));
    }
    assert.ok(plan.slots.find((s) => s.at === 640)!.seats.includes("late"), "늦게 온 딜러는 오자마자 들어감");
  });

  it("keeps earlier slots and re-plans only the rest", () => {
    const first = buildPlan({ dealers: dealers(5), tables: 4, start: 600, end: 720, interval: 20 });
    const kept = first.slots.slice(0, 3);
    const again = buildPlan({ dealers: [...dealers(5), { id: "new", from: 660, to: null }], tables: 4, start: 600, end: 720, interval: 20, keep: kept });
    assert.deepEqual(again.slots.slice(0, 3), kept);
    assert.ok(again.slots.slice(3).some((s) => s.seats.includes("new")));
  });

  it("finds the current and next slot and swaps dealers in a cell", () => {
    const plan = buildPlan({ dealers: dealers(5), tables: 4, start: 600, end: 720, interval: 20 });
    assert.deepEqual(slotIndexAt(plan, 625), { current: 1, next: 2 });
    const slot = plan.slots[0];
    const resting = slot.rest[0];
    const swapped = swapInSlot(slot, 0, resting);
    assert.equal(swapped.seats[0], resting);
    assert.ok(swapped.rest.includes(slot.seats[0]!));
    const moved = swapInSlot(slot, 0, slot.seats[1]);
    assert.equal(moved.seats[1], slot.seats[0]);
  });
});
