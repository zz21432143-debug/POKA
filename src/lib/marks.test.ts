import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DEFAULT_MARK_SRC, OPERATOR_MARK_SRC, displayMarkSrc, publicMarkUrl } from "./mark-assets";
import { MARK_CATEGORIES, SHOP_KINDS, marksInCategory, type MarkCatalogItem } from "./mark-categories";

function item(partial: Partial<MarkCatalogItem> & Pick<MarkCatalogItem, "id" | "name" | "category">): MarkCatalogItem {
  return {
    slug: partial.id,
    imageUrl: `/images/badges/${partial.id}.png`,
    pricePoints: 3000,
    minLevel: 1,
    owned: false,
    equipped: false,
    ...partial,
  };
}

describe("mark shop catalog", () => {
  it("uses a local default mark and operator mark instead of missing badge pngs", () => {
    assert.equal(displayMarkSrc({ profileMarkImageUrl: null }), DEFAULT_MARK_SRC);
    assert.equal(displayMarkSrc({ profileMarkImageUrl: "/images/badges/team_1.png" }), "/marks/team-top.svg");
    assert.equal(displayMarkSrc({ profileMarkImageUrl: "/marks/chip.svg" }), "/marks/chip.svg");
    assert.equal(displayMarkSrc({ isMaster: true, profileMarkImageUrl: "/marks/chip.svg" }), OPERATOR_MARK_SRC);
    assert.equal(publicMarkUrl("/images/badges/team_2.png"), "/marks/team-plime.svg");
    assert.equal(publicMarkUrl("/marks/spade.svg", "spade"), "/marks/spade.svg");
  });

  it("exposes 마크 / 프레임 / 이펙트 shop kinds", () => {
    assert.deepEqual(
      SHOP_KINDS.map((tab) => tab.label),
      ["마크", "프레임", "이펙트"],
    );
  });

  it("exposes 팀 / 레벨 / 특수 tabs", () => {
    assert.deepEqual(
      MARK_CATEGORIES.map((tab) => tab.label),
      ["팀 마크", "레벨 마크", "특수 마크"],
    );
  });

  it("filters team marks for the shop grid", () => {
    const marks = [
      item({ id: "team-a", name: "TOP", category: "TEAM" }),
      item({ id: "crown", name: "크라운", category: "LEVEL", pricePoints: 900 }),
      item({ id: "chip", name: "칩", category: "SPECIAL", pricePoints: 120 }),
    ];
    const team = marksInCategory(marks, "TEAM");
    assert.equal(team.length, 1);
    assert.equal(team[0].name, "TOP");
    assert.equal(team[0].pricePoints, 3000);
  });
});
