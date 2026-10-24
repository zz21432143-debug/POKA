import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { HOLDEM_STACK_NOTES } from "./holdem-stack-notes";
import { HOLDEM_GUIDES } from "./holdem-guides";

describe("25BB 상자 숫자", () => {
  const open = 2.2, stack = 25, preflopPot = 0.5 + 1 + 1;
  const flopPot = open * 2 + 0.5 + 1; // 오픈 + BB 콜 + SB + 앤티
  it("플랍 팟 5.9 · 남은 22.8 · SPR 3.9", () => {
    assert.equal(flopPot.toFixed(1), "5.9");
    assert.equal((stack - open).toFixed(1), "22.8");
    assert.equal(((stack - open) / flopPot).toFixed(1), "3.9");
  });
  it("세 번에 올인: 2 → 6.6 → 14.2", () => {
    const afterFlop = flopPot + 4; // 2BB 벳 + 콜
    const turn = afterFlop * (2 / 3);
    assert.equal(turn.toFixed(1), "6.6");
    assert.equal((stack - open - 2 - turn).toFixed(1), "14.2");
  });
  it("BB 디펜스 20.3% · 오픈 손익분기 47% · 올인 콜 47.1% · 셋 마이닝 10배", () => {
    assert.equal(((1.2 / flopPot) * 100).toFixed(1), "20.3");
    assert.equal(Math.round((open / (open + preflopPot)) * 100), 47);
    assert.equal(((24 / 51) * 100).toFixed(1), "47.1");
    assert.equal(Math.round((stack - open) / open), 10);
  });
  it("상자는 있는 가이드에만 · 카드 표기가 들어 있음", () => {
    const slugs = new Set(HOLDEM_GUIDES.map((g) => g.slug));
    for (const slug of Object.keys(HOLDEM_STACK_NOTES)) assert.ok(slugs.has(slug), slug);
    assert.ok(readFileSync("src/lib/holdem-stack-notes.ts", "utf8").includes("[As 9d]"));
  });
});
