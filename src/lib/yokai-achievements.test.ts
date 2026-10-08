import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { YOKAI_ACHIEVEMENTS, achievementBySlug, auraClassForSrc, isAchievementSlug } from "./yokai-achievements";
import { isYokaiSlug } from "./yokai-marks";

describe("yokai achievements", () => {
  it("unlocks 염라대왕 at 5 and 구미호 at 10, and keeps them out of the shop catalog", () => {
    assert.equal(achievementBySlug("yokai-yama")?.required, 5);
    assert.equal(achievementBySlug("yokai-yama")?.achievement, "지옥의 지배자");
    assert.equal(achievementBySlug("yokai-gumiho")?.required, 10);
    assert.equal(achievementBySlug("yokai-gumiho")?.achievement, "백귀야행의 지배자");
    assert.equal(isAchievementSlug("yokai-yama"), true);
    assert.equal(isYokaiSlug("yokai-yama"), false);
    assert.equal(YOKAI_ACHIEVEMENTS.every((mark) => !isYokaiSlug(mark.slug)), true);
  });

  it("maps equipped art to the red and gold auras", () => {
    assert.equal(auraClassForSrc("/marks/yokai/yama.png"), "aura-yama");
    assert.equal(auraClassForSrc("/marks/yokai/gumiho.png"), "aura-gumiho");
    assert.equal(auraClassForSrc("/marks/yokai/fox.png"), "");
  });
});
