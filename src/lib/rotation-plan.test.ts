import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { alignToStart, buildPlan, dealerSchedule, formatClock, parseClock, slotIndexAt, swapInSlot, type PlanDealer } from "./rotation-plan";

const dealers = (n: number, from = 600): PlanDealer[] => Array.from({ length: n }, (_, i) => ({ id: `d${i + 1}`, from, to: null }));

/**
 * 실제로 가능한 시간표인지: 앉아 있던 딜러가 다음 칸에도 일하면 같은 테이블이어야 함
 * (교대 없이 다른 테이블로 옮기는 일 없음). 자기 테이블이 닫힌 경우만 예외.
 */
function assertPhysical(plan: { slots: { at: number; seats: (string | null)[] }[] }, closedFrom: (number | null)[] = []) {
  for (let i = 1; i < plan.slots.length; i += 1) {
    const prev = plan.slots[i - 1];
    const cur = plan.slots[i];
    prev.seats.forEach((id, t) => {
      if (!id) return;
      const now = cur.seats.indexOf(id);
      const closed = closedFrom[t] != null && cur.at >= (closedFrom[t] as number);
      if (now >= 0 && now !== t && !closed) assert.fail(`${id}: ${formatClock(cur.at)}에 교대 없이 T${t + 1} → T${now + 1}`);
    });
  }
}

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

  it("rotates breaks fairly and keeps seated dealers at their table until relieved", () => {
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
    assertPhysical(plan);
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

describe("실제로 가능한 시간표(교대 없이 이동 없음)", () => {
  for (const [tables, n, streak] of [[4, 6, 0], [8, 10, 0], [15, 19, 3], [21, 26, 2], [5, 5, 0], [6, 14, 1]] as const) {
    it(`테이블 ${tables} · 딜러 ${n}${streak ? ` · 최대 연속 ${streak}` : ""}`, () => {
      const plan = buildPlan({ dealers: dealers(n), tables, start: 600, end: 600 + 30 * 30, interval: 30, maxStreak: streak });
      assertPhysical(plan);
      // 모든 테이블이 매 칸 채워짐(사람이 충분할 때)
      if (n >= tables) for (const slot of plan.slots) assert.equal(slot.seats.filter(Boolean).length, tables);
    });
  }
  it("중간 출근 · 퇴근 · 컨바인이 섞여도", () => {
    const list: PlanDealer[] = [...dealers(8), { id: "late", from: 720, to: null }, { id: "early", from: 600, to: 780 }];
    const closedFrom = [null, null, 840, null, null, null, null];
    const plan = buildPlan({ dealers: list, tables: 7, start: 600, end: 1080, interval: 20, closedFrom, maxStreak: 3 });
    assertPhysical(plan, closedFrom);
  });
  it("게임 중 Auto · 이어 짜기도", async () => {
    const { autoArrange, extendPlan } = await import("./rotation-plan");
    const list = dealers(12);
    const first = buildPlan({ dealers: list, tables: 10, start: 600, end: 900, interval: 30, maxStreak: 3 });
    // 4번째 칸에서 d3 퇴근 · d13 새로 출근 → Auto
    const changed = [...list.map((d) => (d.id === "d3" ? { ...d, to: 700 } : d)), { id: "d13", from: 690, to: null }];
    const auto = autoArrange({ plan: first, dealers: changed, current: 3, tables: 10, start: 600, interval: 30, now: 700, maxStreak: 3 });
    assertPhysical({ slots: auto.slots.slice(3) });
    assertPhysical(extendPlan(auto, changed, 3, 300));
  });
});

describe("늦게 출근한 딜러도 공평하게", () => {
  for (const [tables, early, late, maxStreak] of [[4, 4, 2, 0], [10, 10, 4, 0], [15, 12, 7, 3], [6, 6, 3, 2]] as const) {
    it(`테이블 ${tables} · 10시 ${early}명 · 10시30분 ${late}명${maxStreak ? ` · 최대 연속 ${maxStreak}` : ""}`, () => {
      const list: PlanDealer[] = [
        ...Array.from({ length: early }, (_, i) => ({ id: `e${i}`, from: 600, to: null })),
        ...Array.from({ length: late }, (_, i) => ({ id: `l${i}`, from: 630, to: null })),
      ];
      const plan = buildPlan({ dealers: list, tables, start: 600, end: 600 + 30 * 20, interval: 30, maxStreak });
      assertPhysical(plan);
      // 10시30분 칸: 늦게 온 딜러는 출근하자마자 딜(자리가 있으면)
      const at1030 = plan.slots.find((x) => x.at === 630)!;
      const lateIn = list.filter((d) => d.from === 630 && at1030.seats.includes(d.id)).length;
      assert.equal(lateIn, Math.min(late, tables), `10:30 늦게 온 딜러 중 딜 ${lateIn}/${late}`);
      // 끝까지 보면: 같은 시간 있었던 칸 대비 딜한 비율이 비슷(차이 1칸 안쪽 · 일찍 온 사람이 더 많이 쉬어야 맞음)
      const ratio = (id: string, from: number) => {
        const here = plan.slots.filter((x) => x.at >= from);
        return here.filter((x) => x.seats.includes(id)).length / here.length;
      };
      const er = list.filter((d) => d.from === 600).map((d) => ratio(d.id, 600));
      const lr = list.filter((d) => d.from === 630).map((d) => ratio(d.id, 630));
      const all = [...er, ...lr];
      assert.ok(Math.max(...all) - Math.min(...all) <= 0.15, `딜 비율 차이 ${(Math.max(...all) - Math.min(...all)).toFixed(2)} (일찍 ${er.map((x) => x.toFixed(2))} / 늦게 ${lr.map((x) => x.toFixed(2))})`);
    });
  }
});

describe("들어갔던 테이블 또 안 들어가게(고르게)", () => {
  /** 딜러별 테이블마다 새로 앉은 횟수 */
  const stints = (plan: { slots: { seats: (string | null)[] }[] }) => {
    const out = new Map<string, number[]>();
    plan.slots.forEach((slot, i) => {
      slot.seats.forEach((id, t) => {
        if (!id || plan.slots[i - 1]?.seats[t] === id) return;
        const row = out.get(id) ?? Array(slot.seats.length).fill(0);
        row[t] += 1;
        out.set(id, row);
      });
    });
    return out;
  };
  for (const [tables, n, streak] of [[4, 6, 0], [6, 9, 2], [10, 14, 3], [3, 5, 1]] as const) {
    it(`테이블 ${tables} · 딜러 ${n}: 한 테이블에만 몰리지 않음`, () => {
      const plan = buildPlan({ dealers: dealers(n), tables, start: 600, end: 600 + 20 * 40, interval: 20, maxStreak: streak });
      assertPhysical(plan);
      for (const [id, row] of stints(plan)) {
        const total = row.reduce((a, b) => a + b, 0);
        const fair = Math.ceil(total / tables);
        // 자리가 나는 테이블이 정해져 있어 완전히 똑같진 않아도: 한 테이블에 고른 몫보다 2번 넘게 몰리지 않고, 거의 모든 테이블에 가 봄
        assert.ok(Math.max(...row) <= fair + 2, `${id}: 테이블별 ${row.join(",")} (고르면 ${fair}번씩)`);
        assert.ok(row.filter((x) => x > 0).length >= Math.min(tables, total) - 2, `${id}: 가 본 테이블 ${row.filter((x) => x > 0).length}곳 / ${row.join(",")}`);
      }
    });
  }
});

describe("휴게는 교대 간격 한 칸(30분 교대면 30분)", () => {
  for (const [tables, n, k] of [[3, 5, 0], [5, 7, 0], [5, 8, 3], [6, 10, 2], [8, 11, 0], [10, 14, 3], [15, 19, 4], [4, 8, 0]] as const) {
    it(`테이블 ${tables} · 딜러 ${n}${k ? ` · 최대 연속 ${k}` : ""}: 휴게가 두 칸 이어지지 않음`, () => {
      const plan = buildPlan({ dealers: dealers(n), tables, start: 600, end: 600 + 30 * 24, interval: 30, maxStreak: k });
      assertPhysical(plan);
      for (const d of dealers(n)) {
        const run = dealerSchedule(plan, d.id).map((x) => (x.table ? "W" : "R")).join("");
        assert.ok(!run.slice(1).includes("RR"), `${d.id}: ${run}`);
      }
    });
  }
});

describe("최대한 공평하게(오늘 딜한 시간 · 테이블)", () => {
  /** 딜러별 (딜한 칸 − 공평한 몫). 몫 = 있었던 칸마다 딜 자리 ÷ 그 칸 딜러 수 */
  const owed = (plan: { slots: { seats: (string | null)[]; rest: string[] }[] }) => {
    const work = new Map<string, number>();
    const share = new Map<string, number>();
    for (const slot of plan.slots) {
      const seated = slot.seats.filter(Boolean) as string[];
      const present = [...seated, ...slot.rest];
      for (const id of present) share.set(id, (share.get(id) ?? 0) + seated.length / present.length);
      for (const id of seated) work.set(id, (work.get(id) ?? 0) + 1);
    }
    return [...share].map(([id, s]) => [id, (work.get(id) ?? 0) - s] as const);
  };
  for (const [tables, n, k] of [[8, 10, 2], [15, 19, 3], [4, 6, 0], [6, 9, 0], [10, 14, 2]] as const) {
    it(`테이블 ${tables} · 딜러 ${n}: 늦게 출근 · 일찍 퇴근이 섞여도 딜 시간이 몫과 1칸 반 넘게 차이 안 남`, () => {
      const start = 600;
      const list = dealers(n).map((d, i) => ({
        ...d,
        from: i >= n - Math.ceil(n / 4) ? start + 90 + (i % 3) * 30 : start,
        to: i < 2 ? start + 360 : null,
      }));
      const plan = buildPlan({ dealers: list, tables, start, end: start + 720, interval: 30, maxStreak: k });
      assertPhysical(plan);
      for (const [id, diff] of owed(plan)) assert.ok(Math.abs(diff) <= 1.5, `${id}: 몫보다 ${diff.toFixed(2)}칸`);
    });
  }
  it("테이블 5 · 딜러 10: 같은 테이블에 연달아 들어가지 않음(돌아가며)", () => {
    const plan = buildPlan({ dealers: dealers(10), tables: 5, start: 600, end: 600 + 30 * 24, interval: 30 });
    for (const d of dealers(10)) {
      const tables = dealerSchedule(plan, d.id).map((x) => x.table).filter((t): t is number => Boolean(t));
      for (let i = 1; i < tables.length; i += 1) assert.notEqual(tables[i], tables[i - 1], `${d.id}: ${tables.join(",")}`);
    }
  });
});

describe("Auto 눌러도 교대 없이 테이블 이동 없음", () => {
  it("테이블을 새로 열고 Auto: 막 교대로 나온 딜러를 새 테이블로 바로 보내지 않음", async () => {
    const { autoArrange } = await import("./rotation-plan");
    // 11:00 A T1 · B T2 · C 휴식 → 11:30 C가 T1 교대, A 휴식. 11:30에 T3 추가 오픈 후 Auto
    const plan = { start: 660, end: 900, interval: 30, tables: 3, slots: [
      { at: 660, seats: ["A", "B", null], rest: ["C"] },
      { at: 690, seats: ["C", "B", null], rest: ["A"] },
    ] };
    const list = ["A", "B", "C"].map((id) => ({ id, from: 660, to: null }));
    const auto = autoArrange({ plan, dealers: list, current: 1, tables: 3, start: 660, interval: 30, now: 691 });
    assertPhysical(auto);
    assert.equal(auto.slots[1].seats[0], "A", JSON.stringify(auto.slots[1]));
  });
  it("여러 경우를 섞어(퇴근 · 출근 · 테이블 추가 · 컨바인) 아무 때나 Auto를 눌러도", async () => {
    const { autoArrange, extendPlan } = await import("./rotation-plan");
    let seed = 7;
    const rnd = (n: number) => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed % n;
    };
    for (let run = 0; run < 300; run += 1) {
      const tables = 2 + rnd(13);
      const n = tables + 1 + rnd(tables + 2);
      const list = dealers(n);
      const first = buildPlan({ dealers: list, tables, start: 600, end: 1080, interval: 30, maxStreak: rnd(4) });
      const current = 1 + rnd(8);
      const now = first.slots[current].at + rnd(30);
      const more = rnd(3);
      const changed = [
        ...list.map((d, i) => (i === rnd(n) ? { ...d, to: now } : d)),
        ...Array.from({ length: rnd(3) }, (_, i) => ({ id: `new${i}`, from: now - rnd(20), to: null })),
      ];
      const closedFrom = Array.from({ length: tables + more }, (_, t) => (t < tables && rnd(6) === 0 ? first.slots[current + 1].at : null));
      const widened = { ...first, tables: tables + more, slots: first.slots.map((x) => ({ ...x, seats: [...x.seats, ...Array(more).fill(null)] })) };
      const auto = autoArrange({ plan: widened, dealers: changed, current, tables: tables + more, start: 600, interval: 30, now, closedFrom });
      assertPhysical({ slots: auto.slots.slice(now - first.slots[current].at < 5 ? current - 1 : current) }, closedFrom);
      // 이어 짜기는 지난 칸을 덜어 내지 않는 범위(60칸)라 번호가 같음
      assertPhysical({ slots: extendPlan(auto, changed, current, 300, closedFrom).slots.slice(current) }, closedFrom);
    }
  });
});
