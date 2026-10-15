import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  BLACK,
  SIZE,
  aiMove,
  boardFrom,
  findWinLine,
  forbiddenCells,
  isDoubleThree,
  play,
  type Stone,
} from "./omok";

const at = (x: number, y: number) => y * SIZE + x;
/** 흑 · 백 칸 목록으로 판 만들기 */
function board(blacks: [number, number][], whites: [number, number][] = []) {
  const b: Stone[] = Array(SIZE * SIZE).fill(0);
  for (const [x, y] of blacks) b[at(x, y)] = 1;
  for (const [x, y] of whites) b[at(x, y)] = 2;
  return b;
}

describe("오목 규칙", () => {
  it("정확히 5목이면 승리 · 6목은 승리 아님", () => {
    // 흑 0~3, 백은 아무 데나
    const moves = [
      at(0, 7),
      at(0, 0),
      at(1, 7),
      at(1, 0),
      at(2, 7),
      at(2, 0),
      at(3, 7),
      at(3, 0),
    ];
    const win = play(moves, at(4, 7));
    assert.ok(win.ok && win.winner === BLACK && win.line?.length === 5);
    // 흑 0~4 중 4 비우고 5에 → 6목 만들기: 0,1,2,3,5 + 4
    const six = [
      at(0, 7),
      at(0, 0),
      at(1, 7),
      at(1, 0),
      at(2, 7),
      at(2, 0),
      at(3, 7),
      at(14, 14),
      at(5, 7),
      at(14, 13),
    ];
    const r = play(six, at(4, 7));
    assert.ok(r.ok && r.winner === 0);
  });

  it("흑 삼삼 금지 · 백은 괜찮음", () => {
    // 가로 (6,7)(7,7) + 세로 (8,5)(8,6) → (8,7)에 두면 열린 3 두 줄
    const b = board([
      [6, 7],
      [7, 7],
      [8, 5],
      [8, 6],
    ]);
    assert.ok(isDoubleThree(b, at(8, 7)));
    assert.ok(forbiddenCells(b).includes(at(8, 7)));
    // 한쪽이 막히면 열린 3이 아니라 둘 수 있음
    const blocked = board(
      [
        [6, 7],
        [7, 7],
        [8, 5],
        [8, 6],
      ],
      [[5, 7]],
    );
    assert.ok(!isDoubleThree(blocked, at(8, 7)));
  });

  it("띈 삼(X X _ X)도 열린 3으로 셈", () => {
    // 가로 (5,7)(6,7) _ + (8,7)에 두는 게 아니라: (5,7)(7,7) + 세로 (8,5)(8,6) → (8,7)에 두면 가로 5,7,8(띈 3) + 세로 3
    const b = board([
      [5, 7],
      [6, 7],
      [8, 5],
      [8, 6],
    ]);
    assert.ok(isDoubleThree(b, at(8, 7)));
  });

  it("삼삼이어도 5목이 되면 둘 수 있음", () => {
    const b = board([
      [4, 7],
      [5, 7],
      [6, 7],
      [7, 7],
    ]);
    assert.ok(!isDoubleThree(b, at(8, 7)));
  });

  it("빈칸 아닌 곳 · 판 밖 거절", () => {
    assert.equal(play([at(7, 7)], at(7, 7)).ok, false);
    assert.equal(play([], 999).ok, false);
  });

  it("끝난 판 5목 줄 찾기", () => {
    const moves = [
      at(0, 7),
      at(0, 0),
      at(1, 7),
      at(1, 0),
      at(2, 7),
      at(2, 0),
      at(3, 7),
      at(3, 0),
      at(4, 7),
    ];
    assert.equal(findWinLine(moves)?.length, 5);
    assert.equal(findWinLine(moves.slice(0, -1)), null);
  });
});

describe("요괴 AI", () => {
  const fixed = () => 0.5;
  it("첫 수는 가운데", () => {
    assert.equal(aiMove([], 2, fixed), at(7, 7));
  });
  it("이길 수 있으면 이김 · 상대 4목은 막음(모든 난이도)", () => {
    // 백(AI) 차례: 흑이 (3~6,7) 4개 → (2,7)이나 (7,7) 막아야 함
    const moves = [
      at(3, 7),
      at(3, 3),
      at(4, 7),
      at(10, 10),
      at(5, 7),
      at(12, 2),
      at(6, 7),
    ];
    for (const level of [2, 3, 4] as const) {
      const m = aiMove(moves, level, fixed);
      assert.ok(m === at(2, 7) || m === at(7, 7), `level ${level}: ${m}`);
    }
    // 흑(AI) 차례: 흑 4개 있으면 5목
    const win = [
      at(3, 7),
      at(3, 3),
      at(4, 7),
      at(10, 10),
      at(5, 7),
      at(12, 2),
      at(6, 7),
      at(12, 3),
    ];
    for (const level of [1, 2, 3, 4] as const) {
      const m = aiMove(win, level, fixed);
      assert.ok(m === at(2, 7) || m === at(7, 7), `win level ${level}`);
    }
  });
  it("AI(흑)는 삼삼에 두지 않음 · 판이 끝날 때까지 규칙대로", () => {
    let moves: number[] = [];
    let rnd = 1;
    const rand = () => (rnd = (rnd * 16807) % 2147483647) / 2147483647;
    for (let n = 0; n < 225; n += 1) {
      const m = aiMove(moves, n % 2 === 0 ? 4 : 1, rand);
      if (m < 0) break;
      const r = play(moves, m);
      assert.ok(r.ok, `수 ${n}: ${r.ok ? "" : r.error}`);
      moves = r.moves;
      if (r.winner || r.draw) break;
    }
    assert.ok(moves.length > 5);
    void boardFrom;
  });
});

describe("요괴 AI 강화(위협 읽기)", () => {
  const fixed = () => 0.5;
  it("상대 열린 3은 양끝 중 하나로 막음(염라 · 구미호)", () => {
    // 흑 (5,7)(6,7)(7,7) 열린 3, 백(AI) 차례 — 백 돌 2개는 먼 곳
    const moves = [at(5, 7), at(1, 1), at(6, 7), at(1, 13), at(7, 7)];
    for (const level of [3, 4] as const) {
      const m = aiMove(moves, level, fixed);
      assert.ok(
        [at(4, 7), at(8, 7), at(3, 7), at(9, 7)].includes(m),
        `level ${level}: ${m % 15},${Math.floor(m / 15)}`,
      );
    }
  });
  it("4-3을 만들 수 있으면 만듦", () => {
    // 백(AI): 가로 (3,3)(4,3)(5,3) + 세로 (6,4)(6,5) → (6,3)에 두면 가로 4 + 세로 열린 3
    // 흑은 먼 곳에 흩어 둠(위협 없음)
    const moves = [
      at(10, 12),
      at(3, 3),
      at(12, 10),
      at(4, 3),
      at(14, 14),
      at(6, 4),
      at(0, 14),
      at(6, 5),
      at(13, 0),
    ];
    // 가로가 한쪽 막히게: 흑 (2,3) 추가하려면 순서 맞추기 어려우니 열린 4 또는 4-3이면 통과
    const m = aiMove(moves, 4, fixed);
    assert.ok(
      m === at(6, 3) || m === at(2, 3),
      `got ${m % 15},${Math.floor(m / 15)}`,
    );
  });
  it("구미호는 도깨비 · 텐구를 대부분 이김", () => {
    let seed = 7;
    const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const duel = (a: 1 | 2 | 3 | 4, b: 1 | 2 | 3 | 4) => {
      let moves: number[] = [];
      for (let n = 0; n < 225; n += 1) {
        const m = aiMove(moves, n % 2 === 0 ? a : b, rand);
        if (m < 0) return 0;
        const r = play(moves, m);
        if (!r.ok) return 0;
        moves = r.moves;
        if (r.winner) return r.winner;
        if (r.draw) return 0;
      }
      return 0;
    };
    let wins = 0;
    for (let g = 0; g < 6; g += 1) {
      // 구미호가 흑 3번 · 백 3번
      const r = g % 2 === 0 ? duel(4, g < 3 ? 1 : 2) : duel(g < 3 ? 1 : 2, 4);
      if ((g % 2 === 0 && r === 1) || (g % 2 === 1 && r === 2)) wins += 1;
    }
    assert.ok(wins >= 5, `구미호 ${wins}/6승`);
  });
});
