import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ACCEPT_DAILY_MAX, QUESTION_TEMPLATES, acceptRewarded, canAccept } from "./accept-answer";

const base = { viewerId: "a", postAuthorId: "a", boardType: "HAND_REVIEW" as const, commentAuthorId: "b", alreadyAccepted: false };

describe("좋은 답변 채택", () => {
  it("글쓴이가 남의 댓글을 처음 채택하면 됨", () => {
    assert.deepEqual(canAccept(base), { ok: true });
    assert.deepEqual(canAccept({ ...base, boardType: "RULE_QA" }), { ok: true });
  });

  it("글쓴이가 아니거나 · 내 댓글이거나 · 이미 채택했거나 · 채택 게시판이 아니면 안 됨", () => {
    assert.equal(canAccept({ ...base, viewerId: "c" }).ok, false);
    assert.equal(canAccept({ ...base, commentAuthorId: "a" }).ok, false);
    assert.equal(canAccept({ ...base, commentAuthorId: null }).ok, false);
    assert.equal(canAccept({ ...base, alreadyAccepted: true }).ok, false);
    assert.equal(canAccept({ ...base, boardType: "FREE" }).ok, false);
  });

  it("보상: 답변자 하루 한도 · 같은 사람끼리 반복은 표시만", () => {
    assert.equal(acceptRewarded({ answererAcceptsToday: 0, samePairRecently: false }), true);
    assert.equal(acceptRewarded({ answererAcceptsToday: ACCEPT_DAILY_MAX, samePairRecently: false }), false);
    assert.equal(acceptRewarded({ answererAcceptsToday: 0, samePairRecently: true }), false);
  });

  it("질문 틀은 핸드리뷰 · 룰 질문 · TDA에 있음", () => {
    for (const board of ["HAND_REVIEW", "RULE_QA", "TDA"] as const) assert.ok(QUESTION_TEMPLATES[board]?.includes("\n"), board);
    assert.equal(QUESTION_TEMPLATES.FREE, undefined);
  });
});
