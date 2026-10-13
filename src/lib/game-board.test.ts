import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applyClock, boardStats, clockText, clockView, defaultBoard, makeStructure, normalizeBoard, type GameBoardData } from "./game-board";

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

  it("averages the stack over live players (buy-ins and rebuys counted apart)", () => {
    // 바인 40 × 3만 + 리바인 10 × 2만 + 얼리 20 × 5천 + 애드온 5 × 2만 = 160만 / 25명
    const d = { ...defaultBoard(), entries: 40, remaining: 25, startStack: 30_000, rebuys: 10, rebuyStack: 20_000, earlies: 20, earlyStack: 5_000, addonOn: true, addons: 5, addonStack: 20_000 };
    assert.deepEqual(boardStats(d), { totalChips: 1_600_000, avgStack: 64_000 });
    // 애드온을 화면에서 끄면 애드온 칩은 안 셈
    assert.equal(boardStats({ ...d, addonOn: false }).totalChips, 1_500_000);
    // 예전 현황판(리바인 칩 없음)은 시작 스택과 같게
    assert.equal(normalizeBoard({ startStack: 50_000 }).rebuyStack, 50_000);
    assert.equal(boardStats({ ...d, remaining: 0 }).avgStack, 0);
  });

  it("counts down to registration close (end of level N, breaks skipped in numbering)", () => {
    // 레벨1 20분 · 레벨2 20분 · 휴식 10분 · 레벨3 20분
    const d = { ...board(), regLevel: 3 };
    d.clock.runningSince = 0;
    assert.equal(clockView(d, 5 * MIN).regCloseMs, 65 * MIN);
    assert.equal(clockView(d, 45 * MIN).regCloseMs, 25 * MIN, "휴식 중에도 레벨3 끝까지");
    assert.ok(clockView(d, 69 * MIN).regCloseMs! <= MIN);
    // 레벨 2까지 등록: 휴식에 들어가면 마감
    const d2 = { ...board(), regLevel: 2 };
    d2.clock.runningSince = 0;
    assert.equal(clockView(d2, 30 * MIN).regCloseMs, 10 * MIN);
    assert.deepEqual([clockView(d2, 45 * MIN).regCloseMs, clockView(d2, 45 * MIN).regClosed], [null, true]);
    // 러닝 타임: 레벨 1부터 흐른 시간(휴식 포함)
    assert.equal(clockView(d, 45 * MIN).runningMs, 45 * MIN);
    assert.equal(clockView(d, 0).runningMs, 0);
    // 안 정하면 표시 안 함
    assert.deepEqual([clockView(board(), 0).regCloseMs, clockView(board(), 0).regClosed], [null, false]);
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

  it("converts prizes and formats the clock", () => {
    // 예전 글 상금은 순위 줄로(1·2·3위 금·은·동)
    assert.deepEqual(normalizeBoard({ prize: "1위 300만\n\n2위   150만\nGTD 1,000만" }).prizes, [
      { place: "1위", amount: "300만", color: "gold" },
      { place: "2위", amount: "150만", color: "silver" },
      { place: "GTD", amount: "1,000만", color: "bronze" },
    ]);
    // 이상한 색은 순위 기본 색으로
    assert.equal(normalizeBoard({ prizes: [{ place: "1위", amount: "1", color: "nope" }] }).prizes[0].color, "gold");
    assert.equal(clockText(20 * MIN), "20:00");
    assert.equal(clockText(61_500), "01:02");
    assert.equal(clockText(62 * MIN), "1:02:00");
  });
});
