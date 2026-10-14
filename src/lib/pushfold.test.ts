import assert from "node:assert/strict";
import { describe, it } from "node:test";
import raw from "./data/pushfold-hu.json";
import { rowAt, thresholds, unpackSet, type PushFoldData } from "./pushfold";

const data = raw as PushFoldData;
const ix = (name: string) => data.names.indexOf(name);

describe("heads-up push/fold Nash chart", () => {
  it("has 169 hands and 0.1bb rows for both modes", () => {
    assert.equal(data.names.length, 169);
    assert.equal(data.names[0], "AA");
    assert.equal(data.names[1], "AKs");
    assert.equal(data.names[13], "AKo");
    assert.equal(data.modes.none.rows.filter(Boolean).length, 241);
    assert.ok(data.modes.bbante.rows.filter(Boolean).length > 200);
  });

  it("premium hands always push and call", () => {
    for (const mode of ["none", "bbante"]) {
      for (const row of data.modes[mode].rows) {
        if (!row) continue;
        for (const hand of ["AA", "KK", "AKs"]) {
          assert.ok(unpackSet(row.push).has(ix(hand)), `${mode} ${row.s} push ${hand}`);
          assert.ok(unpackSet(row.call).has(ix(hand)), `${mode} ${row.s} call ${hand}`);
        }
      }
    }
  });

  it("ranges get tighter as stacks get deeper", () => {
    const at = (s: number) => rowAt(data, "none", s)!;
    assert.ok(at(5).pushPct > at(10).pushPct && at(10).pushPct > at(20).pushPct);
    assert.ok(at(5).callPct > at(10).callPct && at(10).callPct > at(20).callPct);
    // 널리 알려진 헤즈업 내시 값(10bb: SB 약 58%, BB 약 37%)과 가까움
    assert.ok(Math.abs(at(10).pushPct - 58) < 2, String(at(10).pushPct));
    assert.ok(Math.abs(at(10).callPct - 37) < 2, String(at(10).callPct));
  });

  it("matches well-known thresholds within a few tenths of a bb", () => {
    const push = thresholds(data, "none", "push");
    const near = (hand: string, value: number, tol = 0.4) => assert.ok(Math.abs(push[ix(hand)] - value) <= tol, `${hand} ${push[ix(hand)]} vs ${value}`);
    near("72o", 1.7);
    near("J2o", 4.7);
    near("Q2o", 7.0);
    near("K2o", 11.5);
    near("K2s", 19.5);
  });

  it("BB ante widens both ranges", () => {
    assert.ok(rowAt(data, "bbante", 10)!.pushPct > rowAt(data, "none", 10)!.pushPct);
    assert.ok(rowAt(data, "bbante", 10)!.callPct > rowAt(data, "none", 10)!.callPct);
  });
});
