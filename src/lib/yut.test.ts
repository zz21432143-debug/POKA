import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { END, START, applyMove, applyThrow, autoStep, dest, newState, throwYut, type YutState } from "./yut";

const seq = (vals: number[]) => {
  let i = 0;
  return () => vals[i++ % vals.length];
};

describe("윷놀이 판", () => {
  it("바깥길 · 지름길 · 도착", () => {
    assert.equal(dest(START, 1), "o1");
    assert.equal(dest(START, 5), "o5");
    assert.equal(dest("o5", 1), "a1");
    assert.equal(dest("o5", 3), "c");
    assert.equal(dest("o10", 3), "c");
    assert.equal(dest("c", 2), "b4");
    assert.equal(dest("c", 3), "o0", "방에서 걸이면 출발 모서리에 멈춤");
    assert.equal(dest("c", 4), END);
    assert.equal(dest("a2", 2), "a3", "a2에서 방을 지나면 a3");
    assert.equal(dest("a4", 1), "o15");
    assert.equal(dest("o19", 1), "o0", "출발 모서리에 딱 닿으면 멈춤");
    assert.equal(dest("o19", 2), END);
    assert.equal(dest("o0", 1), END, "출발 모서리에서는 무엇이 나와도 골인");
    assert.equal(dest("o0", 5), END);
    assert.equal(dest("o18", 5), END);
    assert.equal(dest("b4", 1), "o0");
    assert.equal(dest("o3", 2), "o5");
  });
  it("빽도: 한 칸 뒤 · 출발 전 말은 못 움직임", () => {
    assert.equal(dest("o3", -1), "o2");
    assert.equal(dest("o1", -1), "o0", "o1에서 빽도 → 출발 모서리(다음에 바로 골인)");
    assert.equal(dest("o0", -1), "o19");
    assert.equal(dest(START, -1), null);
    assert.equal(dest("a1", -1), "o5");
    assert.equal(dest("b3", -1), "c");
  });
  it("윷 결과", () => {
    // 앞면 수: 0=모 · 1=도(첫 막대면 빽도) · 2개 · 3걸 · 4윷
    assert.equal(throwYut(seq([0.9, 0.9, 0.9, 0.9])).value, 5);
    assert.equal(throwYut(seq([0.1, 0.1, 0.1, 0.1])).value, 4);
    assert.equal(throwYut(seq([0.9, 0.1, 0.9, 0.9])).value, 1);
    assert.equal(throwYut(seq([0.1, 0.9, 0.9, 0.9])).value, -1);
    assert.equal(throwYut(seq([0.1, 0.1, 0.9, 0.9])).value, 2);
  });
});

describe("윷놀이 진행", () => {
  it("윷 · 모는 한 번 더, 잡으면 한 번 더, 업기", () => {
    let s = newState(2);
    s = applyThrow(s, seq([0.1, 0.1, 0.1, 0.1])); // 윷
    assert.equal(s.phase, "throw");
    s = applyThrow(s, seq([0.9, 0.1, 0.9, 0.9])); // 도
    assert.equal(s.phase, "move");
    assert.deepEqual(s.results, [4, 1]);
    let r = applyMove(s, 0, 0);
    assert.ok(r.ok);
    s = r.state;
    assert.equal(s.pieces.A[0].pos, "o4");
    r = applyMove(s, 0, 1);
    assert.ok(r.ok);
    s = r.state;
    assert.equal(s.turnTeam, "B");
    // B가 o1에 있는 A를 잡게: A를 o1로 옮겨 두고 B가 도
    const st: YutState = { ...s, pieces: { A: [{ pos: "o1" }, { pos: "o4" }], B: [{ pos: START }, { pos: START }] }, phase: "move", results: [1], throws: 0 };
    r = applyMove(st, 0, 0);
    assert.ok(r.ok && r.state.event?.type === "capture" && r.state.pieces.A[0].pos === START && r.state.phase === "throw" && r.state.turnTeam === "B");
    // 업기: 같은 칸 두 말이 함께
    const up: YutState = { ...st, turnTeam: "A", pieces: { A: [{ pos: "o2" }, { pos: "o2" }], B: [{ pos: START }, { pos: START }] }, results: [3] };
    r = applyMove(up, 0, 0);
    assert.ok(r.ok && r.state.pieces.A.every((p) => p.pos === "o5"));
  });
  it("모두 완주하면 승리 · AI만으로도 끝까지", () => {
    let s = newState(4);
    let rnd = 7;
    const rand = () => ((rnd = (rnd * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 2000 && !s.winner; i += 1) s = autoStep(s, rand, i);
    assert.ok(s.winner === "A" || s.winner === "B", "AI 대결이 끝남");
    assert.ok(s.pieces[s.winner!].every((p) => p.pos === END));
  });
  it("출발 전 말뿐인데 빽도만 나오면 차례 넘김", () => {
    const s = applyThrow(newState(2), seq([0.1, 0.9, 0.9, 0.9]));
    assert.equal(s.turnTeam, "B");
    assert.equal(s.event?.type, "skip");
  });
  it("낙: 던지기가 없던 일 · 남은 결과 없으면 차례 넘김", () => {
    const s = applyThrow(newState(2), seq([0.9, 0.1, 0.9, 0.9, 0.01]), 1, 80);
    assert.equal(s.turnTeam, "B");
    assert.equal(s.lastThrow?.value, 0);
    assert.equal(s.lastThrow?.power, 80);
    assert.ok(s.event?.nak);
  });
  it("출발 모서리 말도 잡힘 · 빽도로 모서리 → 다음 차례 골인", () => {
    const base = newState(2);
    const st: YutState = { ...base, turnTeam: "B", pieces: { A: [{ pos: "o0" }, { pos: START }], B: [{ pos: "o19" }, { pos: START }] }, phase: "move", results: [1], throws: 0 };
    const r = applyMove(st, 0, 0);
    assert.ok(r.ok && r.state.event?.type === "capture" && r.state.pieces.A[0].pos === START);
    const back: YutState = { ...base, pieces: { A: [{ pos: "o1" }, { pos: START }], B: [{ pos: START }, { pos: START }] }, phase: "move", results: [-1], throws: 0 };
    const b = applyMove(back, 0, 0);
    assert.ok(b.ok && b.state.pieces.A[0].pos === "o0");
    assert.equal(dest(b.ok ? b.state.pieces.A[0].pos : "", 1), END);
  });
  it("한 칸씩: 밟고 간 칸 · 움직인 말", () => {
    let s = applyThrow(newState(2), seq([0.1, 0.1, 0.9, 0.9, 0.9])); // 개
    const r = applyMove(s, 0, 0);
    assert.ok(r.ok);
    s = r.state;
    assert.deepEqual(s.event?.path, ["o1", "o2"]);
    assert.deepEqual(s.event?.moved, [0]);
  });
});
