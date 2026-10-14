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

describe("position push/fold charts", async () => {
  const fs = await import("node:fs");
  const pos = JSON.parse(fs.readFileSync(new URL("../../public/data/gto-positions.json", import.meta.url), "utf8"));
  const row = (mode: string, size: number, seat: string, s: number) => pos.modes[mode].tables[size][seat].find((r: { s: number } | null) => r && r.s === s);

  it("SB vs BB in a full table matches the heads-up chart", () => {
    for (const s of [5, 10, 15, 20]) {
      const multi = row("none", 9, "SB", s);
      const huRow = rowAt(data, "none", s)!;
      // 거의 무차별(올인·폴드 EV가 같은)한 경계 패 1~2개는 반복 횟수에 따라 갈릴 수 있음
      const diff = (x: string, y: string) => {
        const A = unpackSet(x);
        const B = unpackSet(y);
        return [...A].filter((k) => !B.has(k)).length + [...B].filter((k) => !A.has(k)).length;
      };
      assert.ok(diff(multi.push, huRow.push) <= 2, `${s}bb push`);
      assert.ok(diff(multi.calls.BB.set, huRow.call) <= 2, `${s}bb call`);
      assert.ok(Math.abs(multi.pushPct - huRow.pushPct) <= 0.5);
    }
  });

  it("earlier positions push tighter", () => {
    for (const size of [6, 9]) {
      const seats: string[] = pos.positions[size].slice(0, -1);
      for (const s of [8, 12, 20]) {
        const pcts = seats.map((seat) => row("none", size, seat, s).pushPct);
        for (let i = 1; i < pcts.length; i++) assert.ok(pcts[i] >= pcts[i - 1] - 0.5, `${size}인 ${s}bb ${seats[i]} ${pcts.join("/")}`);
      }
    }
  });

  it("6-max and 9-max agree from the hijack on (same players behind)", () => {
    for (const seat of ["HJ", "CO", "BTN"]) assert.equal(row("none", 6, seat, 10).push, row("none", 9, seat, 10).push, seat);
  });
});
