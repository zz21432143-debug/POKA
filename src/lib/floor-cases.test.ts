import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { FLOOR_CASES } from "./floor-cases";
import { GUIDE_ARTICLES } from "./info-pages";

describe("현장 판정 사례", () => {
  it("id가 겹치지 않고 · 이어지는 가이드가 실제로 있고 · 금지 단어가 없음", () => {
    assert.equal(new Set(FLOOR_CASES.map((c) => c.id)).size, FLOOR_CASES.length);
    const guides = new Set(GUIDE_ARTICLES.map((g) => g.slug));
    for (const c of FLOOR_CASES) {
      if (c.guide) assert.ok(guides.has(c.guide.href.replace("/info/guide/", "")), `${c.id}: ${c.guide.href}`);
      assert.equal(/바카라|캐시|현금|수익/.test(`${c.situation}${c.ruling}${c.why}${c.house}`), false, c.id);
    }
  });
});
