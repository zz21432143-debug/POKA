import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { nextStreakBonus } from "./rewards";
import { liveStreak } from "./attendance";

describe("attendance streak", () => {
  it("keeps the streak only when the last check-in was today or yesterday", () => {
    const today = "2026-10-11";
    assert.equal(liveStreak({ attendanceStreak: 5, lastAttendanceDate: "2026-10-11" }, today), 5);
    assert.equal(liveStreak({ attendanceStreak: 5, lastAttendanceDate: "2026-10-10" }, today), 5);
    assert.equal(liveStreak({ attendanceStreak: 5, lastAttendanceDate: "2026-10-09" }, today), 0);
    assert.equal(liveStreak(null, today), 0);
  });

  it("points to the next milestone bonus", () => {
    assert.deepEqual(
      [nextStreakBonus(0)?.day, nextStreakBonus(0)?.daysLeft],
      [3, 3],
    );
    assert.equal(nextStreakBonus(2)?.label, "3일 연속");
    assert.equal(nextStreakBonus(2)?.daysLeft, 1);
    assert.equal(nextStreakBonus(3)?.day, 7);
    assert.equal(nextStreakBonus(29)?.day, 30);
    // 30일 이후에는 7일 단위 반복(35일)
    assert.equal(nextStreakBonus(30)?.day, 35);
  });
});
