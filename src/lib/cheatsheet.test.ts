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

describe("아웃츠 예시 카드를 직접 세기", () => {
  const RANKS = "23456789TJQKA";
  const deck = [...RANKS].flatMap((r) => [..."shdc"].map((s) => r + s));
  const rankOf = (c: string) => RANKS.indexOf(c[0]) + 2;
  const straight = (cards: string[]) => {
    const set = new Set(cards.map(rankOf));
    if (set.has(14)) set.add(1);
    for (let hi = 14; hi >= 5; hi--) if ([0, 1, 2, 3, 4].every((d) => set.has(hi - d))) return true;
    return false;
  };
  const flush = (cards: string[]) => [..."shdc"].some((s) => cards.filter((c) => c[1] === s).length >= 5);
  const count = (hand: string, board: string, hit: (all: string[], c: string) => boolean) => {
    const seen = new Set([...hand.split(" "), ...board.split(" ")]);
    return deck.filter((c) => !seen.has(c) && hit([...hand.split(" "), ...board.split(" "), c], c)).length;
  };
  it("표에 적은 아웃츠 수와 같음", async () => {
    const { OUTS_EXAMPLES } = await import("./cheatsheet");
    const rule: Record<number, (all: string[], c: string, hand: string) => boolean> = {
      2: (_a, c, hand) => c[0] === hand[0],
      6: (_a, c, hand) => hand.split(" ").some((h) => h[0] === c[0]),
    };
    for (const e of OUTS_EXAMPLES) {
      const n = count(e.hand, e.board, (all, c) => (rule[e.outs] ? rule[e.outs](all, c, e.hand) : straight(all) || flush(all)));
      assert.equal(n, e.outs, `${e.label}: ${n}`);
    }
  });
});
