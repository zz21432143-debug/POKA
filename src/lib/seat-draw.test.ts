import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { drawResultText, drawSeats, parsePlayers, type DrawPlayer } from "./seat-draw";

function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

function field(n: number, random: () => number): DrawPlayer[] {
  return Array.from({ length: n }, (_, i) => ({ name: `P${i + 1}`, chips: Math.round(20000 + random() * 380000) }));
}

describe("DAY2 seat draw", () => {
  it("parses names and chip counts from pasted text or CSV", () => {
    const { players, errors } = parsePlayers("이름,칩\n홍길동 125,000\n김철수,98000\n\"이 영희\",\"1,200,000\"\n박민수\t45000\n잘못된줄");
    assert.deepEqual(players, [
      { name: "홍길동", chips: 125000 },
      { name: "김철수", chips: 98000 },
      { name: "이 영희", chips: 1200000 },
      { name: "박민수", chips: 45000 },
    ]);
    assert.equal(errors.length, 1);
  });

  it("seats everyone once, keeps table sizes within one, and uses unique random seats", () => {
    const random = seeded(7);
    const players = field(47, random);
    const result = drawSeats(players, { tableCount: 5, seatsPerTable: 10, random });
    const seated = result.tables.flatMap((t) => t.players);
    assert.equal(seated.length, 47);
    assert.equal(new Set(seated.map((p) => p.name)).size, 47);
    const sizes = result.tables.map((t) => t.players.length);
    assert.ok(Math.max(...sizes) - Math.min(...sizes) <= 1, String(sizes));
    for (const table of result.tables) {
      const seats = table.players.map((p) => p.seat);
      assert.equal(new Set(seats).size, seats.length);
      assert.ok(seats.every((s) => s >= 1 && s <= 10));
    }
    assert.deepEqual(result.tables.map((t) => t.table), [1, 2, 3, 4, 5]);
  });

  it("balances table average stacks closely, even with uneven table sizes", () => {
    for (const [n, tables, seed] of [[54, 6, 42], [47, 5, 7], [83, 9, 11]] as const) {
      const random = seeded(seed);
      const result = drawSeats(field(n, random), { tableCount: tables, seatsPerTable: 10, random });
      // 테이블 평균 칩 차이가 전체 평균의 2% 이내
      assert.ok(result.averageSpread / result.overallAverage < 0.02, `${n}명: ${result.averageSpread} of ${result.overallAverage}`);
    }
  });

  it("differs between runs (random) and refuses when seats run out", () => {
    const players = field(18, seeded(1));
    const a = drawResultText(drawSeats(players, { tableCount: 2, seatsPerTable: 9, random: seeded(3) }));
    const b = drawResultText(drawSeats(players, { tableCount: 2, seatsPerTable: 9, random: seeded(4) }));
    assert.notEqual(a, b);
    assert.throws(() => drawSeats(field(20, seeded(1)), { tableCount: 2, seatsPerTable: 9 }), /좌석이 모자랍니다/);
  });
});
