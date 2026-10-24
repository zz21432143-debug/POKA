import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { MATCHUPS, outsRow, potOddsNeeded } from "./cheatsheet";

const eqData = JSON.parse(readFileSync("public/data/preflop-eq.json", "utf8")) as { names: string[]; eq: number[] };

describe("참고 표", () => {
  it("아웃츠: 플러시 드로우 9장 = 턴 19.1% · 두 장 35.0% · 리버 19.6%", () => {
    const r = outsRow(9);
    assert.equal(r.turn.toFixed(1), "19.1");
    assert.equal(r.both.toFixed(1), "35.0");
    assert.equal(r.river.toFixed(1), "19.6");
    assert.equal(outsRow(15).both.toFixed(1), "54.1");
  });

  it("팟 오즈: 1/2 팟 25% · 팟 33.3% · 2/3 팟 28.6%", () => {
    assert.equal(potOddsNeeded(0.5).toFixed(1), "25.0");
    assert.equal(potOddsNeeded(1).toFixed(1), "33.3");
    assert.equal(potOddsNeeded(2 / 3).toFixed(1), "28.6");
  });

  it("맞대결 승률은 승률 계산기 데이터와 같음(소수 첫째 자리)", () => {
    const n = eqData.names;
    for (const m of MATCHUPS) {
      const v = eqData.eq[n.indexOf(m.a) * 169 + n.indexOf(m.b)] / 100;
      assert.equal(v.toFixed(1), m.eqA.toFixed(1), `${m.a} vs ${m.b}`);
    }
  });
});
