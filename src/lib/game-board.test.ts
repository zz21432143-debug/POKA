import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applyClock, boardStats, clockText, clockView, defaultBoard, makeStructure, normalizeBoard, prizeLines, type GameBoardData } from "./game-board";

const MIN = 60_000;
function board(levels = [20, 20, 10, 20].map((minutes, i) => (i === 2 ? { sb: 0, bb: 0, ante: 0, minutes, isBreak: true } : { sb: 100 * (i + 1), bb: 200 * (i + 1), ante: 200 * (i + 1), minutes }))): GameBoardData {
  return { ...defaultBoard(), levels, clock: { level: 0, elapsedMs: 0, runningSince: null } };
}

describe("game board clock", () => {
  it("counts down and rolls into the next levels on its own", () => {
    const d = board();
    d.clock.runningSince = 0;
    assert.equal(clockView(d, 5 * MIN).remainingMs, 15 * MIN);
    const v = clockView(d, 25 * MIN);
    assert.equal(v.index, 1);
    assert.equal(v.number, 2);
    assert.equal(v.remainingMs, 15 * MIN);
    // 레벨 2 다음은 휴식: 남은 15분 뒤 휴식
    assert.equal(v.nextBreakMs, 15 * MIN);
    const brk = clockView(d, 45 * MIN);
    assert.ok(brk.level.isBreak);
    assert.equal(brk.number, 2);
    assert.equal(brk.nextBreakMs, null);
    const end = clockView(d, 999 * MIN);
    assert.ok(end.finished);
    assert.equal(end.remainingMs, 0);
    assert.equal(end.running, false);
  });

  it("pauses, resumes and adjusts time", () => {
    let d = board();
    d.clock = applyClock(d, { op: "start" }, 1_000);
    d.clock = applyClock(d, { op: "pause" }, 1_000 + 3 * MIN);
    assert.deepEqual(d.clock, { level: 0, elapsedMs: 3 * MIN, runningSince: null });
    // 멈춘 동안은 그대로
    assert.equal(clockView(d, 10 ** 9).remainingMs, 17 * MIN);
    d.clock = applyClock(d, { op: "add", ms: MIN }, 0);
    assert.equal(clockView(d, 0).remainingMs, 18 * MIN);
    d.clock = applyClock(d, { op: "add", ms: -60 * MIN }, 0);
    assert.equal(clockView(d, 0).remainingMs, 1_000);
    d = { ...d, clock: applyClock(d, { op: "start" }, 50) };
    assert.equal(clockView(d, 50 + 500).remainingMs, 500);
  });

  it("moves levels: next, prev (restart first), jump, reset", () => {
    const d = board();
    d.clock = applyClock(d, { op: "next" }, 0);
    assert.equal(clockView(d, 0).index, 1);
    d.clock = applyClock(d, { op: "start" }, 0);
    // 30초 지났으면 이전 = 이번 레벨 처음
    d.clock = applyClock(d, { op: "prev" }, 30_000);
    assert.deepEqual([clockView(d, 30_000).index, clockView(d, 30_000).remainingMs], [1, 20 * MIN]);
    d.clock = applyClock(d, { op: "prev" }, 31_000);
    assert.equal(clockView(d, 31_000).index, 0);
    assert.ok(d.clock.runningSince != null, "돌던 시계는 계속 돔");
    d.clock = applyClock(d, { op: "jump", index: 99 }, 0);
    assert.equal(clockView(d, 0).index, 3);
    d.clock = applyClock(d, { op: "reset" }, 0);
    assert.deepEqual(d.clock, { level: 0, elapsedMs: 0, runningSince: null });
  });
});

describe("game board data", () => {
  it("builds a structure in 100 chip units with breaks", () => {
    const s = makeStructure({ startBb: 200, minutes: 15, count: 8, breakEvery: 4 });
    assert.equal(s.filter((l) => l.isBreak).length, 1);
    assert.ok(s.every((l) => l.isBreak || (l.bb % 100 === 0 && l.sb % 100 === 0 && l.ante === l.bb && l.minutes === 15)));
    assert.deepEqual(s.slice(0, 3).map((l) => l.bb), [200, 300, 400]);
  });

  it("averages the stack over remaining players", () => {
    const d = { ...defaultBoard(), entries: 40, remaining: 25, startStack: 30_000, rebuys: 10, rebuyStack: 30_000, addons: 5, addonStack: 20_000 };
    assert.deepEqual(boardStats(d), { totalChips: 1_600_000, avgStack: 64_000 });
    assert.equal(boardStats({ ...d, remaining: 0 }).avgStack, 0);
  });

  it("cleans bad input", () => {
    const d = normalizeBoard({ name: "", levels: [{ sb: -5, bb: "abc", minutes: 0 }, { isBreak: true, sb: 999, minutes: 10 }], entries: 1e9, clock: { level: 50, runningSince: "x" } });
    assert.equal(d.name, "메인 토너먼트");
    assert.deepEqual(d.levels[0], { sb: 0, bb: 0, ante: 0, minutes: 1 });
    assert.deepEqual(d.levels[1], { sb: 0, bb: 0, ante: 0, minutes: 10, isBreak: true });
    assert.equal(d.entries, 10_000);
    assert.equal(d.clock.level, 1);
    assert.equal(d.clock.runningSince, null, "이상한 값이면 멈춘 것으로");
    assert.ok(normalizeBoard(null).levels.length > 0);
  });

  it("formats prize lines and clock", () => {
    assert.deepEqual(prizeLines("1위 300만\n\n2위   150만\nGTD 1,000만"), [
      { place: "1위", amount: "300만" },
      { place: "2위", amount: "150만" },
      { place: "GTD", amount: "1,000만" },
    ]);
    assert.equal(clockText(20 * MIN), "20:00");
    assert.equal(clockText(61_500), "01:02");
    assert.equal(clockText(62 * MIN), "1:02:00");
  });
});
