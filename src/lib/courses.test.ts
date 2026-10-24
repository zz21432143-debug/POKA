import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { COURSES, courseOf, isCourseStep, newlyCompleted, stepKey } from "./courses";
import { HOLDEM_GUIDES } from "./holdem-guides";
import { GUIDE_ARTICLES } from "./info-pages";

describe("공부 코스", () => {
  it("코스의 모든 글이 실제로 있음 · 코스 안에서 겹치지 않음", () => {
    const holdem = new Set(HOLDEM_GUIDES.map((g) => g.slug));
    const guide = new Set(GUIDE_ARTICLES.map((g) => g.slug));
    for (const course of COURSES) {
      const keys = course.steps.map(stepKey);
      assert.equal(new Set(keys).size, keys.length, course.id);
      for (const step of course.steps) assert.ok((step.kind === "holdem" ? holdem : guide).has(step.slug), `${course.id}: ${stepKey(step)} 없음`);
    }
  });

  it("다음 글 · 마지막 글", () => {
    const first = courseOf({ kind: "guide", slug: "seats-and-button" });
    assert.equal(first?.course.id, "start");
    assert.equal(first?.next?.slug, "blinds-antes");
    assert.equal(courseOf({ kind: "holdem", slug: "short-deck-rules" })?.next, null);
    assert.equal(courseOf({ kind: "holdem", slug: "slowplay" }), null);
  });

  it("다 읽은 코스만 보상 · 이미 받은 코스는 다시 안 줌", () => {
    const variants = COURSES.find((c) => c.id === "variants");
    assert.ok(variants);
    const read = new Set(variants.steps.map(stepKey));
    assert.deepEqual(newlyCompleted(read, new Set()), ["variants"]);
    assert.deepEqual(newlyCompleted(read, new Set(["variants"])), []);
    assert.deepEqual(newlyCompleted(new Set(["holdem:omaha-rules"]), new Set()), []);
  });

  it("코스 글만 읽음으로 받음", () => {
    assert.equal(isCourseStep("holdem:position"), true);
    assert.equal(isCourseStep("holdem:../../etc"), false);
  });
});
