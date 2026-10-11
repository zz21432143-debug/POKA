import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { findMatches, isRuleHeading, sortTdaSections } from "./tda";

describe("tda viewer", () => {
  it("제목 앞 번호 순, 번호 없으면 올린 순", () => {
    const rows = [
      { title: "10. 미스딜", createdAt: "2026-10-01" },
      { title: "머리말", createdAt: "2026-10-03" },
      { title: "2. 플로어", createdAt: "2026-10-05" },
      { title: "Rule 1: Floor", createdAt: "2026-10-04" },
    ];
    assert.deepEqual(sortTdaSections(rows).map((r) => r.title), ["Rule 1: Floor", "2. 플로어", "10. 미스딜", "머리말"]);
  });

  it("조항 머리줄과 검색 위치", () => {
    assert.equal(isRuleHeading("1. 플로어 결정"), true);
    assert.equal(isRuleHeading("제3조 올인"), true);
    assert.equal(isRuleHeading("RULE 12: Dead Button"), true);
    assert.equal(isRuleHeading("플로어의 결정은 최종입니다."), false);
    assert.deepEqual(findMatches("All-in all IN", "all"), [
      { start: 0, end: 3 },
      { start: 7, end: 10 },
    ]);
    assert.deepEqual(findMatches("abc", " "), []);
    assert.deepEqual(findMatches("모든 핸드, 올 인 상황", "올인"), [{ start: 7, end: 10 }]);
    assert.deepEqual(findMatches("a.b a+b", "a+b"), [{ start: 4, end: 7 }]);
  });
});
