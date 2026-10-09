import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  YOKAI_ACHIEVEMENTS,
  achievementBySlug,
  auraClassForSrc,
  isAchievementSlug,
  levelRewardSlugs,
} from "./yokai-achievements";
import { pickUnusedKingSlug } from "./yokai-kings";
import { isYokaiSlug, LEGEND_MARK_PRICE, REGULAR_MARK_PRICE, YOKAI_MARKS, KOREAN_LEGEND_MARKS } from "./yokai-marks";
import { markPriceTag } from "./yokai-catalog";

describe("yokai rewards", () => {
  it("grants 구미호 at 200 and 염라대왕 at 250, never as shop stock", () => {
    assert.equal(achievementBySlug("yokai-gumiho")?.minLevel, 200);
    assert.equal(achievementBySlug("yokai-yama")?.minLevel, 250);
    assert.deepEqual(levelRewardSlugs(199), []);
    assert.deepEqual(levelRewardSlugs(200), ["yokai-gumiho"]);
    assert.deepEqual(levelRewardSlugs(250), ["yokai-gumiho", "yokai-yama"]);
    assert.equal(isAchievementSlug("yokai-yama"), true);
    assert.equal(isYokaiSlug("yokai-yama"), false);
    assert.equal(YOKAI_ACHIEVEMENTS.every((mark) => !isYokaiSlug(mark.slug)), true);
  });

  it("prices regular marks at 3000 and Korean legends at 5000", () => {
    assert.equal(YOKAI_MARKS.every((mark) => mark.pricePoints === REGULAR_MARK_PRICE), true);
    assert.equal(KOREAN_LEGEND_MARKS.every((mark) => mark.pricePoints === LEGEND_MARK_PRICE), true);
    assert.equal(markPriceTag({ slug: "yokai-oni", pricePoints: 3000 }), `${(3000).toLocaleString()} P`);
    assert.equal(markPriceTag({ slug: "yokai-gumiho", pricePoints: 0 }), "구매 불가 / 비매품");
    assert.equal(markPriceTag({ slug: "yokai-jiguk", pricePoints: 0 }), "랭킹 보상");
  });

  it("picks a king the winner does not already own", () => {
    assert.equal(pickUnusedKingSlug(["yokai-jiguk", "yokai-jeungjang", "yokai-gwangmok"], () => 0), "yokai-damun");
    assert.equal(pickUnusedKingSlug(["yokai-jiguk", "yokai-jeungjang", "yokai-gwangmok", "yokai-damun"]), null);
  });

  it("maps equipped art to the red and gold auras", () => {
    assert.equal(auraClassForSrc("/marks/yokai/yama.png"), "aura-yama");
    assert.equal(auraClassForSrc("/marks/yokai/gumiho.png"), "aura-gumiho");
    assert.equal(auraClassForSrc("/marks/yokai/fox.png"), "");
  });
});
