import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { cardIndex, categoryOf, evalCards } from "./hand-eval";
import { exactEquity, requiredEquity } from "./equity";

const c = (s: string) => s.match(/../g)!.map(cardIndex);

describe("equity calculator", () => {
  it("evaluator orders hands", () => {
    assert.ok(evalCards(c("AsKsQsJsTs2c3d")) > evalCards(c("AcAdAhAsKd2c3d")));
    assert.ok(evalCards(c("Ac2d3h4s5c9dJh")) < evalCards(c("2d3h4s5c6d9dJh")));
    assert.equal(categoryOf(evalCards(c("AhAdKcKhQs2d3h"))), 2);
  });

  it("AA vs KK preflop is about 82% (exact enumeration)", async () => {
    const r = await exactEquity(c("AhAs"), c("KdKc"), []);
    assert.equal(r.samples, 1712304);
    assert.ok(r.win > 0.81 && r.win < 0.83, String(r.win));
    assert.ok(Math.abs(r.win + r.tie + r.lose - 1) < 1e-9);
  });

  it("flop/turn/river counts and a made hand", async () => {
    const flop = await exactEquity(c("AhAs"), c("KdKc"), c("2c7d9h"));
    assert.equal(flop.samples, 990);
    const turn = await exactEquity(c("AhAs"), c("KdKc"), c("2c7d9hKh"));
    assert.equal(turn.samples, 44);
    // 턴에 K 셋: KK가 앞섬, A 남은 1장(As·Ah 빼고 Ad, Ac 2장)이면 AA 역전
    assert.ok(Math.abs(turn.win - 2 / 44) < 1e-9, String(turn.win));
    const river = await exactEquity(c("AhAs"), c("KdKc"), c("2c7d9hKhAd"));
    assert.equal(river.samples, 1);
    assert.equal(river.win, 1);
  });

  it("required equity for a call", () => {
    // 팟 100에 상대 50 베팅 → 50 / 200 = 25%
    assert.equal(requiredEquity(100, 50), 0.25);
  });
});
