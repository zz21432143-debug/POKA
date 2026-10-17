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

describe("setup slot before the game", () => {
  it("adds a setup slot 30 minutes before start, then rotates from the start", () => {
    const plan = buildPlan({ dealers: dealers(5, 600), tables: 4, start: 600, end: 680, interval: 20, setup: 30 });
    assert.deepEqual(plan.slots.map((s) => formatClock(s.at)), ["09:30", "10:00", "10:20", "10:40", "11:00"]);
    // 10:00에 오는 딜러들도 세팅 칸에 들어감
    assert.equal(plan.slots[0].seats.filter(Boolean).length, 4);
    // 다시 짜기에서도 세팅 칸 유지
    const again = buildPlan({ dealers: dealers(5, 600), tables: 4, start: 600, end: 680, interval: 20, setup: 30, keep: plan.slots.slice(0, 2) });
    assert.deepEqual(again.slots.slice(0, 2), plan.slots.slice(0, 2));
    assert.equal(again.slots.length, 5);
  });
});

describe("open-ended rotation", async () => {
  const { retimeFrom, extendPlan } = await import("./rotation-plan");
  it("retimes a slot and lines up later slots to the interval", () => {
    const plan = buildPlan({ dealers: dealers(5), tables: 4, start: 780, end: 900, interval: 15 });
    const moved = retimeFrom(plan, 2, 815); // 13:30 → 13:35
    assert.deepEqual(moved.slots.map((s) => formatClock(s.at)), ["13:00", "13:15", "13:35", "13:50", "14:05", "14:20", "14:35", "14:50"]);
    assert.deepEqual(moved.slots[2].seats, plan.slots[2].seats);
    // 간격을 바꾸면 그 뒤 칸만 새 간격으로
    const wider = retimeFrom(plan, 2, plan.slots[2].at, 20);
    assert.deepEqual(wider.slots.slice(1, 4).map((s) => formatClock(s.at)), ["13:15", "13:30", "13:50"]);
  });

  it("keeps going past the first horizon without an end time", () => {
    const plan = buildPlan({ dealers: dealers(6), tables: 4, start: 600, end: 600 + 60, interval: 20 });
    const longer = extendPlan(plan, dealers(6), 2, 120);
    assert.deepEqual(longer.slots.slice(0, 3), plan.slots);
    assert.ok(longer.slots.length >= 9, String(longer.slots.length));
    assert.equal(longer.slots[3].at, 660);
    // 손으로 바꾼 시간 뒤로도 간격대로 이어짐
    const shifted = retimeFrom(plan, 2, 645);
    assert.equal(extendPlan(shifted, dealers(6), 2, 60).slots[3].at, 665);
  });
});

describe("table combine", () => {
  it("stops staffing a combined table from its close time and skips it when rotating", () => {
    const plan = buildPlan({ dealers: dealers(6), tables: 4, start: 600, end: 720, interval: 20, closedFrom: [null, null, 640, null] });
    for (const slot of plan.slots) {
      if (slot.at >= 640) {
        assert.equal(slot.seats[2], null, formatClock(slot.at));
        assert.equal(slot.seats.filter(Boolean).length, 3);
        assert.equal(slot.rest.length, 3);
      } else {
        assert.equal(slot.seats.filter(Boolean).length, 4);
      }
    }
  });
});

describe("Auto arrange", async () => {
  const { autoArrange } = await import("./rotation-plan");
  it("keeps valid seats now, refills seats of a dealer who left, and re-plans the rest", () => {
    const list = dealers(6);
    const plan = buildPlan({ dealers: list, tables: 4, start: 600, end: 720, interval: 20 });
    const current = 2; // 10:40
    const leaver = plan.slots[current].seats[1]!;
    const stayers = plan.slots[current].seats.filter((id, t) => t !== 1);
    const after = autoArrange({
      plan,
      dealers: list.map((d) => (d.id === leaver ? { ...d, to: 645 } : d)),
      current,
      tables: 4,
      start: 600,
      interval: 20,
      now: 645,
    });
    const now = after.slots[current];
    assert.deepEqual(after.slots.slice(0, current), plan.slots.slice(0, current));
    assert.deepEqual(now.seats.filter((_, t) => t !== 1), stayers);
    assert.ok(now.seats[1] && now.seats[1] !== leaver, "빈자리를 다른 딜러로");
    assert.ok(after.slots.slice(current).every((s) => !s.seats.includes(leaver) && !s.rest.includes(leaver)));
  });

  it("empties a table combined now and moves its dealer to rest", () => {
    const list = dealers(5);
    const plan = buildPlan({ dealers: list, tables: 4, start: 600, end: 720, interval: 20 });
    const after = autoArrange({ plan, dealers: list, current: 1, tables: 4, start: 600, interval: 20, now: 625, closedFrom: [null, null, 620, null] });
    assert.equal(after.slots[1].seats[2], null);
    assert.equal(after.slots[1].rest.length, 2);
    assert.ok(after.slots.slice(1).every((s) => s.seats[2] === null));
  });
});

describe("Auto picks who comes out", async () => {
  const { autoArrange } = await import("./rotation-plan");
  it("fills a leaver's seat with the dealer who has rested the longest", () => {
    // T1~T2, 딜러 4명: d3는 2칸째 쉬는 중, d4는 이번 칸부터 쉼
    const plan = {
      start: 600,
      interval: 20,
      tables: 2,
      slots: [
        { at: 600, seats: ["d1", "d4"], rest: ["d3", "d2"] },
        { at: 620, seats: ["d1", "d2"], rest: ["d3", "d4"] },
      ],
    };
    const list = [
      { id: "d1", from: 600, to: 625 },
      { id: "d2", from: 600, to: null },
      { id: "d3", from: 600, to: null },
      { id: "d4", from: 600, to: null },
    ];
    const after = autoArrange({ plan: plan as never, dealers: list, current: 1, tables: 2, start: 600, interval: 20, now: 626 });
    assert.equal(after.slots[1].seats[0], "d3");
    assert.equal(after.slots[1].seats[1], "d2");
    assert.ok(after.slots.slice(1).every((s) => !s.seats.includes("d1") && !s.rest.includes("d1")));
  });
});

describe("max consecutive deal", async () => {
  const { dealersNeeded } = await import("./rotation-plan");
  const longest = (plan: ReturnType<typeof buildPlan>, ids: string[]) => {
    let max = 0;
    for (const id of ids) {
      let run = 0;
      for (const slot of plan.slots) {
        run = slot.seats.includes(id) ? run + 1 : 0;
        max = Math.max(max, run);
      }
    }
    return max;
  };
  it("keeps every dealer within the limit when there are enough dealers", () => {
    // 20테이블, 4칸(80분) 제한 → 25명 필요
    assert.equal(dealersNeeded(20, 4), 25);
    const list = dealers(25);
    const plan = buildPlan({ dealers: list, tables: 20, start: 600, end: 600 + 720, interval: 20, maxStreak: 4 });
    assert.ok(longest(plan, list.map((d) => d.id)) <= 4, `최장 ${longest(plan, list.map((d) => d.id))}칸`);
    assert.ok(plan.slots.every((slot) => slot.seats.every(Boolean)));
    assert.equal(plan.maxStreak, 4);
  });
  it("still fills every table when short of dealers (limit can't be kept)", () => {
    const list = dealers(23);
    const plan = buildPlan({ dealers: list, tables: 20, start: 600, end: 600 + 720, interval: 20, maxStreak: 4 });
    assert.ok(plan.slots.every((slot) => slot.seats.every(Boolean)));
  });
});

describe("open more tables mid-game", async () => {
  const { remapPlanTables, autoArrange } = await import("./rotation-plan");
  it("keeps assignments by table number, adds empty new tables, and Auto fills them", () => {
    // T9~T12 운영 중, 딜러 7명(3명 휴식) → T7, T8 추가 오픈
    const list = dealers(7);
    const plan = buildPlan({ dealers: list, tables: 4, start: 600, end: 720, interval: 20 });
    const before = plan.slots[2];
    const moved = remapPlanTables(plan, [9, 10, 11, 12], [7, 8, 9, 10, 11, 12])!;
    assert.equal(moved.tables, 6);
    assert.deepEqual(moved.slots[2].seats.slice(2), before.seats, "T9~T12 배정 그대로");
    assert.deepEqual(moved.slots[2].seats.slice(0, 2), [null, null], "T7·T8은 빈칸");
    const after = autoArrange({ plan: moved, dealers: list, current: 2, tables: 6, start: 600, interval: 20, now: 645 });
    assert.deepEqual(after.slots[2].seats.slice(2), before.seats, "Auto 뒤에도 기존 테이블 그대로");
    assert.ok(after.slots[2].seats.slice(0, 2).every(Boolean), "Auto가 쉬던 딜러로 T7·T8 채움");
    assert.ok(after.slots.slice(3).every((s) => s.seats.filter(Boolean).length === 6), "다음 칸부터 6테이블");
  });
  it("renames when no number overlaps and the count is the same, otherwise asks to rebuild", () => {
    const plan = buildPlan({ dealers: dealers(5), tables: 4, start: 600, end: 680, interval: 20 });
    assert.deepEqual(remapPlanTables(plan, [5, 6, 7, 8], [1, 2, 3, 4])!.slots, plan.slots);
    assert.equal(remapPlanTables(plan, [5, 6, 7, 8], [1, 2]), null);
  });
  it("moves dealers of removed tables to rest", () => {
    const plan = buildPlan({ dealers: dealers(5), tables: 4, start: 600, end: 680, interval: 20 });
    const moved = remapPlanTables(plan, [1, 2, 3, 4], [1, 2, 3])!;
    const gone = plan.slots[0].seats[3]!;
    assert.ok(moved.slots[0].rest.includes(gone));
  });
});

describe("테이블에 못 넣는 딜러", () => {
  it("막은 딜러는 그 테이블에 앉지 않음(Auto 처음 짜기)", () => {
    const dealers = ["a", "b", "c", "d"].map((id) => ({ id, from: 600, to: null }));
    const plan = buildPlan({ dealers, tables: 2, start: 600, end: 840, interval: 20, blocked: [["a", "b"], []] });
    for (const slot of plan.slots) {
      assert.ok(slot.seats[0] !== "a" && slot.seats[0] !== "b", `T1에 막힌 딜러: ${slot.seats[0]}`);
    }
    assert.ok(plan.slots.some((slot) => slot.seats[1] === "a" || slot.seats[1] === "b"), "다른 테이블엔 들어감");
  });
  it("직접 배치용 빈 시간표: 딜러 없이 칸만", () => {
    const plan = buildPlan({ dealers: [], tables: 3, start: 600, end: 720, interval: 20 });
    assert.ok(plan.slots.length >= 5);
    assert.ok(plan.slots.every((slot) => slot.seats.length === 3 && slot.seats.every((id) => id === null)));
  });
});
