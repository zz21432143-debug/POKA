import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { QUIZ_STACKS, answerOf, maxPushStack, pickSpot, type PosData } from "./pushfold-quiz";

const data = JSON.parse(readFileSync("public/data/gto-positions.json", "utf8")) as PosData;

describe("푸시폴드 퀴즈", () => {
  it("모든 자리 · 문제 스택에 정답 줄이 있음", () => {
    for (const size of ["6", "9"] as const)
      for (const mode of Object.keys(data.modes))
        for (const position of data.positions[size].slice(0, -1))
          for (const stack of QUIZ_STACKS) assert.ok(answerOf(data, { size, mode, position, stack, hand: 0 }), `${size}/${mode}/${position}/${stack}`);
  });

  it("AA는 어디서든 올인 · 72o는 UTG 15BB에서 폴드", () => {
    const aa = data.names.indexOf("AA");
    const seven2 = data.names.indexOf("72o");
    assert.equal(answerOf(data, { size: "9", mode: "none", position: "UTG", stack: 15, hand: aa })?.push, true);
    assert.equal(answerOf(data, { size: "9", mode: "none", position: "UTG", stack: 15, hand: seven2 })?.push, false);
    assert.ok(maxPushStack(data, { size: "9", mode: "none", position: "UTG", hand: aa }) >= 25);
  });

  it("문제 고르기는 언제나 있는 자리 · 스택 · 패", () => {
    let seed = 7;
    const rand = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
    for (let i = 0; i < 200; i++) {
      const spot = pickSpot(data, rand);
      assert.ok(answerOf(data, spot), JSON.stringify(spot));
      assert.ok(spot.hand >= 0 && spot.hand < 169);
    }
  });
});
