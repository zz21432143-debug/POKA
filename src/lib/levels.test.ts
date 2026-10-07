import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  EXP_PER_LEVEL,
  MAX_LEVEL,
  buildLevelRows,
  levelFromExp,
  levelTitle,
  memberRankTitle,
  requiredExpForLevel,
} from "./levels";
import { ATTENDANCE_POINTS, DAILY_POINT_CAP, MARK_PRICE_POINTS } from "./rewards";

describe("activity levels", () => {
  it("caps at 250 and treats 100 exp as one level", () => {
    assert.equal(MAX_LEVEL, 250);
    assert.equal(EXP_PER_LEVEL, 100);
    assert.equal(levelFromExp(0), 1);
    assert.equal(levelFromExp(99), 1);
    assert.equal(levelFromExp(100), 2);
    assert.equal(levelFromExp(24900), 250);
    assert.equal(levelFromExp(999999), 250);
    assert.equal(requiredExpForLevel(1), 0);
    assert.equal(requiredExpForLevel(250), 24900);
    assert.equal(buildLevelRows().length, 250);
  });

  it("names ranks by level band", () => {
    assert.equal(levelTitle(1), "연습 딜러");
    assert.equal(levelTitle(29), "연습 딜러");
    assert.equal(levelTitle(30), "딜러");
    assert.equal(levelTitle(99), "딜러");
    assert.equal(levelTitle(100), "메인 딜러");
    assert.equal(levelTitle(149), "메인 딜러");
    assert.equal(levelTitle(150), "러너");
    assert.equal(levelTitle(199), "러너");
    assert.equal(levelTitle(200), "플로어");
    assert.equal(levelTitle(249), "플로어");
    assert.equal(levelTitle(250), "TD");
    assert.equal(memberRankTitle({ level: 250, isMaster: true }), null);
    assert.equal(memberRankTitle({ level: 75, isAdmin: true }), null);
    assert.equal(memberRankTitle({ level: 7 }), "연습 딜러");
  });

  it("needs about eight attendance days for a 3000P mark", () => {
    assert.equal(MARK_PRICE_POINTS, 3000);
    assert.equal(DAILY_POINT_CAP, 375);
    assert.equal(ATTENDANCE_POINTS, 375);
    assert.equal(Math.ceil(MARK_PRICE_POINTS / DAILY_POINT_CAP), 8);
  });
});
