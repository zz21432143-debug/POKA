import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { GLOSSARY, glossaryGroups, initialOf } from "./glossary";
import { HOLDEM_GUIDES } from "./holdem-guides";
import { GUIDE_ARTICLES } from "./info-pages";

describe("용어 사전", () => {
  it("용어가 겹치지 않고 · 이어지는 가이드가 실제로 있음", () => {
    assert.equal(new Set(GLOSSARY.map((t) => t.term)).size, GLOSSARY.length);
    const holdem = new Set(HOLDEM_GUIDES.map((g) => g.slug));
    const guide = new Set(GUIDE_ARTICLES.map((g) => g.slug));
    for (const t of GLOSSARY) {
      if (!t.href) continue;
      const m = t.href.match(/^\/info\/(holdem|guide)\/(.+)$/);
      if (!m) continue;
      assert.ok((m[1] === "holdem" ? holdem : guide).has(m[2]), `${t.term}: ${t.href} 없음`);
      assert.equal(/바카라|캐시|현금|수익/.test(t.def), false, t.term);
    }
  });

  it("초성 묶기(쌍자음은 기본 자음 · 영어 · 숫자는 A~Z)", () => {
    assert.equal(initialOf("갓샷"), "ㄱ");
    assert.equal(initialOf("빅"), "ㅂ");
    assert.equal(initialOf("ICM"), "A~Z");
    assert.equal(initialOf("3벳"), "A~Z");
    const total = glossaryGroups().reduce((n, g) => n + g.terms.length, 0);
    assert.equal(total, GLOSSARY.length);
  });
});
