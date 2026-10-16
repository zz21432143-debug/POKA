import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  EXP_PER_LEVEL,
  MAX_LEVEL,
  buildLevelRows,
  levelFromExp,
  levelTitle,
  memberRankTitle,
  progressFromExp,
  requiredExpForLevel,
} from "./levels";
import { ATTENDANCE_POINTS, DAILY_POINT_CAP, MARK_PRICE_POINTS } from "./rewards";

describe("activity levels", () => {
  it("caps at 250 · 1~29레벨은 100, 높은 구간일수록 한 레벨에 더 많은 경험치", () => {
    assert.equal(MAX_LEVEL, 250);
    assert.equal(EXP_PER_LEVEL, 100);
    assert.equal(levelFromExp(0), 1);
    assert.equal(levelFromExp(99), 1);
    assert.equal(levelFromExp(100), 2);
    assert.equal(requiredExpForLevel(30), 2900);
    assert.equal(requiredExpForLevel(100), 13400);
    assert.equal(requiredExpForLevel(150), 25900);
    assert.equal(requiredExpForLevel(200), 43400);
    assert.equal(levelFromExp(65900), 250);
    assert.equal(levelFromExp(65899), 249);
    assert.equal(levelFromExp(999999), 250);
    assert.equal(requiredExpForLevel(1), 0);
    assert.equal(requiredExpForLevel(250), 65900);
    // 구간 경계 앞뒤에서 레벨 ↔ 경험치가 서로 맞음
    for (const lv of [29, 30, 31, 99, 100, 101, 149, 150, 199, 200, 249]) assert.equal(levelFromExp(requiredExpForLevel(lv)), lv);
    assert.equal(buildLevelRows().length, 250);
    assert.deepEqual(progressFromExp(1, 0), {
      currentLevelExp: 0,
      nextLevelExp: 100,
      progressPercent: 0,
    });
    assert.equal(progressFromExp(250, 65900).progressPercent, 100);
    assert.equal(progressFromExp(250, 65900).nextLevelExp, null);
    // 경험치 옮기기 마이그레이션: Lv120 · 50% → 18525
    assert.equal(levelFromExp(18525), 120);
    assert.equal(progressFromExp(120, 18525).progressPercent, 50);
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

  it("마크 3000P: 출석만이면 20일, 출석 + 활동 한도면 6일", () => {
    assert.equal(MARK_PRICE_POINTS, 3000);
    assert.equal(DAILY_POINT_CAP, 700);
    assert.equal(ATTENDANCE_POINTS, 195);
    assert.equal(Math.ceil(MARK_PRICE_POINTS / ATTENDANCE_POINTS), 16);
    assert.equal(Math.ceil(MARK_PRICE_POINTS / (ATTENDANCE_POINTS + DAILY_POINT_CAP)), 4);
  });
});
