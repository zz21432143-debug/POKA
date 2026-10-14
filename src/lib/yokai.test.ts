import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { STARTERS, YOKAI, YOKAI_ORDER, feedsAllowed, fullnessNow, nextStageProgress, stageForExp } from "./yokai";

describe("요괴 마을 계산", () => {
  it("스타팅은 도깨비 · 잉어 · 삼두구미, 모든 요괴는 5단계 이름이 있음", () => {
    assert.deepEqual(STARTERS, ["dokkaebi", "ingeo", "samdugumi"]);
    for (const s of YOKAI_ORDER) assert.equal(YOKAI[s].stages.length, 5, s);
  });

  it("경험치로 단계가 정해지고 5단계에서 멈춤", () => {
    assert.equal(stageForExp(0), 1);
    assert.equal(stageForExp(99), 1);
    assert.equal(stageForExp(100), 2);
    assert.equal(stageForExp(699), 3);
    assert.equal(stageForExp(1500), 5);
    assert.equal(stageForExp(99999), 5);
    assert.deepEqual(nextStageProgress(150), { stage: 2, have: 50, need: 200, to: 300 });
    assert.equal(nextStageProgress(1500), null);
  });

  it("포만감은 시간이 지나면 줄지만 0 밑으로 안 내려감", () => {
    const at = new Date("2026-10-15T00:00:00Z");
    assert.equal(fullnessNow(80, at, new Date("2026-10-15T10:00:00Z")), 50);
    assert.equal(fullnessNow(80, at, new Date("2026-10-20T00:00:00Z")), 0);
    assert.equal(fullnessNow(80, at, at), 80);
  });

  it("하루 밥: 기본 1 + 출석 · 퀴즈 · 글", () => {
    assert.equal(feedsAllowed({ attended: false, quiz: false, wrote: false }), 1);
    assert.equal(feedsAllowed({ attended: true, quiz: true, wrote: true }), 4);
  });
});
