import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CONTENT_PLAN, EXTRA_PLAN, PLACEHOLDER, scheduleSummary } from "./content-plan";
import { findProfanity } from "./profanity";
import { holdemOnlyViolation } from "./holdem-only";
import { normalizeHand, validateHandReview } from "./hand-review";

describe("weekly content plan", () => {
  it("has 14 posts, two per day", () => {
    assert.equal(CONTENT_PLAN.length, 14);
    for (const day of "월화수목금토일") assert.equal(CONTENT_PLAN.filter((p) => p.day === day).length, 2, day);
  });

  it("passes the forbidden word and holdem-only filters", () => {
    for (const post of [...CONTENT_PLAN, ...EXTRA_PLAN]) {
      const text = `${post.title}\n${post.content}`;
      assert.equal(findProfanity(text), null, `${post.id}: ${JSON.stringify(findProfanity(text))}`);
      assert.equal(holdemOnlyViolation(text), null, post.id);
    }
  });

  it("ships valid hands for the hand review posts", () => {
    for (const post of [...CONTENT_PLAN, ...EXTRA_PLAN].filter((p) => p.boardType === "HAND_REVIEW" && !p.manualHand)) {
      assert.ok(post.hand, post.id);
      assert.equal(validateHandReview(normalizeHand(post.hand)), null, post.id);
    }
  });

  it("only the posts that need real data keep placeholders", () => {
    const withPlaceholder = CONTENT_PLAN.filter((p) => `${p.title}${p.content}`.includes(PLACEHOLDER)).map((p) => p.id);
    assert.deepEqual(withPlaceholder.sort(), ["sat-1", "sat-2"]);
  });

  it("extra posts are ready to publish and do not reuse titles", () => {
    const titles = new Set(CONTENT_PLAN.map((p) => p.title));
    for (const post of EXTRA_PLAN) {
      assert.ok(!titles.has(post.title), post.id);
      assert.ok(!`${post.title}${post.content}`.includes(PLACEHOLDER), post.id);
    }
  });

  it("lists tournaments by date", () => {
    const text = scheduleSummary(
      [
        { id: "a", title: "작은 대회", eventDate: "2026-10-17", eventEndDate: null, promoLocation: "서울", eventPrize: "GTD 1,000만" },
        { id: "b", title: "큰 대회", eventDate: "2026-10-18", eventEndDate: "2026-10-19", promoLocation: "부산", eventPrize: "GTD 3억" },
      ],
      "week",
    );
    assert.ok(text);
    assert.ok(text.indexOf("작은 대회") < text.indexOf("큰 대회"));
    assert.ok(!text.includes("총상금"));
    assert.match(text, /10\/18\(일\) ~ 10\/19\(월\)/);
    assert.equal(scheduleSummary([], "weekend"), null);
  });
});
