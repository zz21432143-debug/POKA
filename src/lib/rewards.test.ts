import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ATTENDANCE_POINTS,
  DAILY_POINT_CAP,
  STREAK_MILESTONES,
  STREAK_REPEAT_AFTER,
  STREAK_REPEAT_EVERY,
  STREAK_REPEAT_EXP,
  STREAK_REPEAT_POINTS,
  streakBonusFor,
} from "./rewards";
import { isDummyOfficialPosterTitle, isSeedCatalogNickname } from "./purge-demo-catalog";

describe("streak attendance bonus", () => {
  it("pays extra on 3 / 7 / 14 / 30 day milestones", () => {
    assert.equal(streakBonusFor(1), null);
    assert.equal(streakBonusFor(2), null);
    assert.deepEqual(streakBonusFor(3), { points: 50, exp: 20, label: "3일 연속" });
    assert.deepEqual(streakBonusFor(7), { points: 150, exp: 50, label: "7일 연속" });
    assert.deepEqual(streakBonusFor(14), { points: 300, exp: 80, label: "14일 연속" });
    assert.deepEqual(streakBonusFor(30), { points: 750, exp: 150, label: "30일 연속" });
    assert.equal(STREAK_MILESTONES.length, 4);
  });

  it("repeats a weekly bonus after 30 days without eating the daily cap", () => {
    assert.equal(streakBonusFor(31), null);
    assert.deepEqual(streakBonusFor(35), {
      points: STREAK_REPEAT_POINTS,
      exp: STREAK_REPEAT_EXP,
      label: "35일 연속",
    });
    assert.equal(streakBonusFor(STREAK_REPEAT_AFTER + STREAK_REPEAT_EVERY), null);
    assert.equal(DAILY_POINT_CAP, ATTENDANCE_POINTS);
  });
});

describe("seed catalog purge helpers", () => {
  it("recognizes demo nicknames and dummy poster titles", () => {
    assert.equal(isSeedCatalogNickname("펠트딜러"), true);
    assert.equal(isSeedCatalogNickname("정태규"), false);
    assert.equal(isSeedCatalogNickname("POKA"), false);
    assert.equal(isDummyOfficialPosterTitle("RunnerOne 총상금 11억"), true);
    assert.equal(isDummyOfficialPosterTitle("실제 제휴 공지"), false);
  });
});
