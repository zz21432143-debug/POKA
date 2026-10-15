/**
 * 요괴 오목 규칙(화면 · 서버 · AI가 같이 씀).
 * 15×15 · 흑 먼저 · 가로 · 세로 · 대각선으로 정확히 5개면 승리(6개 이상은 승리 아님) · 흑만 삼삼 금지.
 * 판 = 길이 225 배열(0 빈칸 · 1 흑 · 2 백), 수 = 칸 번호(y * 15 + x).
 */
export const SIZE = 15;
export const CELLS = SIZE * SIZE;
export type Stone = 0 | 1 | 2;
export const BLACK = 1 as const;
export const WHITE = 2 as const;
/** 한 수 제한 시간(초) — 친구 대전 */
export const TURN_SECONDS = 60;
/** 화점(별) */
export const STAR_POINTS = [
  3 * SIZE + 3,
  3 * SIZE + 11,
  7 * SIZE + 7,
  11 * SIZE + 3,
  11 * SIZE + 11,
];

const DIRS = [
  [1, 0],
  [0, 1],
  [1, 1],
  [1, -1],
] as const;

export const xyOf = (i: number) => ({ x: i % SIZE, y: Math.floor(i / SIZE) });
const inside = (x: number, y: number) =>
  x >= 0 && y >= 0 && x < SIZE && y < SIZE;
const idx = (x: number, y: number) => y * SIZE + x;
/** 몇 번째 수의 색(0번째 = 흑) */
export const colorOfMove = (n: number): Stone => (n % 2 === 0 ? BLACK : WHITE);
export const other = (c: Stone): Stone => (c === BLACK ? WHITE : BLACK);

export function boardFrom(moves: number[]): Stone[] {
  const b: Stone[] = Array(CELLS).fill(0);
  moves.forEach((m, n) => {
    b[m] = colorOfMove(n);
  });
  return b;
}

/** (x, y)에서 한 방향으로 c색이 몇 개 이어지는지(자기 칸 제외) */
function count(
  b: Stone[],
  x: number,
  y: number,
  dx: number,
  dy: number,
  c: Stone,
) {
  let n = 0;
  let cx = x + dx;
  let cy = y + dy;
  while (inside(cx, cy) && b[idx(cx, cy)] === c) {
    n += 1;
    cx += dx;
    cy += dy;
  }
  return n;
}

/** p에 c가 놓였을 때 정확히 5목이 되는 줄(칸 5개) · 없으면 null */
export function fiveLine(b: Stone[], p: number, c: Stone): number[] | null {
  const { x, y } = xyOf(p);
  for (const [dx, dy] of DIRS) {
    const back = count(b, x, y, -dx, -dy, c);
    const fwd = count(b, x, y, dx, dy, c);
    if (back + fwd + 1 === 5)
      return Array.from({ length: 5 }, (_, k) =>
        idx(x + (k - back) * dx, y + (k - back) * dy),
      );
  }
  return null;
}

/** p를 지나는 dir 방향 c색 4개가 「열린 4」인지: 양 끝이 비었고, 어느 쪽을 채워도 정확히 5(6목 아님) */
function straightFour(b: Stone[], p: number, dx: number, dy: number, c: Stone) {
  const { x, y } = xyOf(p);
  const back = count(b, x, y, -dx, -dy, c);
  const fwd = count(b, x, y, dx, dy, c);
  if (back + fwd + 1 !== 4) return false;
  const sx = x - (back + 1) * dx;
  const sy = y - (back + 1) * dy;
  const ex = x + (fwd + 1) * dx;
  const ey = y + (fwd + 1) * dy;
  if (
    !inside(sx, sy) ||
    !inside(ex, ey) ||
    b[idx(sx, sy)] !== 0 ||
    b[idx(ex, ey)] !== 0
  )
    return false;
  // 끝을 채웠을 때 6목이 되면 열린 4가 아님
  const ssx = sx - dx;
  const ssy = sy - dy;
  const eex = ex + dx;
  const eey = ey + dy;
  if (inside(ssx, ssy) && b[idx(ssx, ssy)] === c) return false;
  if (inside(eex, eey) && b[idx(eex, eey)] === c) return false;
  return true;
}

/** p(이미 c가 놓인 상태)가 dir 방향으로 「열린 3」을 만드는지: 한 칸 더 두면 p를 포함한 열린 4가 됨 */
function openThree(b: Stone[], p: number, dx: number, dy: number, c: Stone) {
  const { x, y } = xyOf(p);
  for (let k = -4; k <= 4; k += 1) {
    if (k === 0) continue;
    const qx = x + k * dx;
    const qy = y + k * dy;
    if (!inside(qx, qy)) continue;
    const q = idx(qx, qy);
    if (b[q] !== 0) continue;
    b[q] = c;
    // q에 두어 생긴 4개가 p를 포함하는 열린 4인지
    const ok = straightFour(b, q, dx, dy, c) && lineHas(b, q, dx, dy, c, p);
    b[q] = 0;
    if (ok) return true;
  }
  return false;
}

/** q를 지나는 dir 방향 c색 연속 줄 안에 p가 있는지 */
function lineHas(
  b: Stone[],
  q: number,
  dx: number,
  dy: number,
  c: Stone,
  p: number,
) {
  const { x, y } = xyOf(q);
  const back = count(b, x, y, -dx, -dy, c);
  const fwd = count(b, x, y, dx, dy, c);
  for (let k = -back; k <= fwd; k += 1)
    if (idx(x + k * dx, y + k * dy) === p) return true;
  return false;
}

/** 흑 금수(삼삼): p에 흑을 두면 열린 3이 두 줄 이상 생김(5목이 되는 수는 예외) */
export function isDoubleThree(b: Stone[], p: number) {
  if (b[p] !== 0) return false;
  b[p] = BLACK;
  try {
    if (fiveLine(b, p, BLACK)) return false;
    let threes = 0;
    for (const [dx, dy] of DIRS) {
      if (openThree(b, p, dx, dy, BLACK)) threes += 1;
      if (threes >= 2) return true;
    }
    return false;
  } finally {
    b[p] = 0;
  }
}

/** 흑 차례에 둘 수 없는 칸(화면에 ❌) */
export function forbiddenCells(b: Stone[]): number[] {
  const out: number[] = [];
  for (let p = 0; p < CELLS; p += 1)
    if (b[p] === 0 && nearStone(b, p, 2) && isDoubleThree(b, p)) out.push(p);
  return out;
}

function nearStone(b: Stone[], p: number, r: number) {
  const { x, y } = xyOf(p);
  for (let dy = -r; dy <= r; dy += 1)
    for (let dx = -r; dx <= r; dx += 1) {
      const nx = x + dx;
      const ny = y + dy;
      if (inside(nx, ny) && b[idx(nx, ny)] !== 0) return true;
    }
  return false;
}

export type PlayResult =
  | { ok: false; error: string }
  | {
      ok: true;
      moves: number[];
      winner: Stone;
      line: number[] | null;
      draw: boolean;
    };

/** 수 두기 검사: 빈칸 · 흑 삼삼 금지 · 승패(5목) · 무승부(판이 꽉 참) */
export function play(moves: number[], p: number): PlayResult {
  if (!Number.isInteger(p) || p < 0 || p >= CELLS)
    return { ok: false, error: "판 밖이에요." };
  const b = boardFrom(moves);
  if (b[p] !== 0) return { ok: false, error: "이미 돌이 있어요." };
  const c = colorOfMove(moves.length);
  if (c === BLACK && isDoubleThree(b, p))
    return { ok: false, error: "흑은 삼삼에 둘 수 없어요." };
  b[p] = c;
  const line = fiveLine(b, p, c);
  const next = [...moves, p];
  return {
    ok: true,
    moves: next,
    winner: line ? c : 0,
    line,
    draw: !line && next.length >= CELLS,
  };
}

/** 끝난 판의 5목 줄 찾기(다시 보기 · 새로 고침용) */
export function findWinLine(moves: number[]): number[] | null {
  if (!moves.length) return null;
  const b = boardFrom(moves);
  const last = moves[moves.length - 1];
  return fiveLine(b, last, b[last]);
}

/* ───────── 요괴 AI ───────── */

export type AiLevel = 1 | 2 | 3 | 4;
/** 5칸 창에 내 돌이 n개(상대 돌 없음)일 때 점수 */
const WIN_W = [0, 2, 20, 260, 3000, 1_000_000];

/** p에 c를 둘 때의 가치: p를 포함한 5칸 창들 중 상대 돌이 없는 창마다 점수 */
function cellValue(b: Stone[], p: number, c: Stone) {
  const { x, y } = xyOf(p);
  let total = 0;
  for (const [dx, dy] of DIRS) {
    for (let s = -4; s <= 0; s += 1) {
      let mine = 1;
      let blocked = false;
      for (let k = 0; k < 5; k += 1) {
        const cx = x + (s + k) * dx;
        const cy = y + (s + k) * dy;
        if (!inside(cx, cy)) {
          blocked = true;
          break;
        }
        if (s + k === 0) continue;
        const v = b[idx(cx, cy)];
        if (v === c) mine += 1;
        else if (v !== 0) {
          blocked = true;
          break;
        }
      }
      if (!blocked) total += WIN_W[mine];
    }
  }
  return total;
}

function candidates(b: Stone[], c: Stone) {
  const out: number[] = [];
  for (let p = 0; p < CELLS; p += 1) {
    if (b[p] !== 0 || !nearStone(b, p, 2)) continue;
    if (c === BLACK && isDoubleThree(b, p)) continue;
    out.push(p);
  }
  return out;
}

/** 공격 + 수비 점수로 정렬한 후보 */
function ranked(b: Stone[], c: Stone, defense: number) {
  const o = other(c);
  return candidates(b, c)
    .map((p) => {
      b[p] = c;
      const win = fiveLine(b, p, c) ? 1 : 0;
      b[p] = 0;
      return {
        p,
        win,
        score: cellValue(b, p, c) + cellValue(b, p, o) * defense,
      };
    })
    .sort((a, z) => z.win - a.win || z.score - a.score);
}

/** p(c가 놓인 상태)를 지나는 dir 방향으로 「4」(한 칸 더 두면 정확히 5목)가 있는지 */
function fourDir(b: Stone[], p: number, dx: number, dy: number, c: Stone) {
  const { x, y } = xyOf(p);
  for (let k = -4; k <= 4; k += 1) {
    if (k === 0) continue;
    const qx = x + k * dx;
    const qy = y + k * dy;
    if (!inside(qx, qy)) continue;
    const q = idx(qx, qy);
    if (b[q] !== 0) continue;
    b[q] = c;
    const back = count(b, qx, qy, -dx, -dy, c);
    const fwd = count(b, qx, qy, dx, dy, c);
    const ok = back + fwd + 1 === 5 && lineHas(b, q, dx, dy, c, p);
    b[q] = 0;
    if (ok) return true;
  }
  return false;
}

/**
 * p에 c를 두면 생기는 위협 점수: 5목 > 열린 4 · 4-4 · 4-3(다음에 반드시 이김) > 3-3(백만) > 4 > 열린 3.
 * 흑은 삼삼 자리에 못 두니 0.
 */
export function threatScore(b: Stone[], p: number, c: Stone) {
  if (b[p] !== 0) return 0;
  if (c === BLACK && isDoubleThree(b, p)) return 0;
  b[p] = c;
  try {
    if (fiveLine(b, p, c)) return 100_000_000;
    let open4 = 0;
    let four = 0;
    let open3 = 0;
    for (const [dx, dy] of DIRS) {
      if (straightFour(b, p, dx, dy, c)) open4 += 1;
      else if (fourDir(b, p, dx, dy, c)) four += 1;
      else if (openThree(b, p, dx, dy, c)) open3 += 1;
    }
    if (open4 || four >= 2 || (four && open3)) return 1_000_000;
    if (open3 >= 2) return 200_000;
    return four * 4_000 + open3 * 2_500;
  } finally {
    b[p] = 0;
  }
}

/** 위협까지 보는 후보 순위(염라대왕 · 구미호): 내 공격 + 상대가 거기 두면 생길 위협(막기) + 모양 점수 */
function rankedSharp(b: Stone[], c: Stone) {
  const o = other(c);
  return candidates(b, c)
    .map((p) => {
      const attack = threatScore(b, p, c);
      const defense = threatScore(b, p, o);
      return {
        p,
        win: attack >= 100_000_000 ? 1 : 0,
        score:
          attack +
          defense * 0.9 +
          cellValue(b, p, c) +
          cellValue(b, p, o) * 0.9,
      };
    })
    .sort((a, z) => z.win - a.win || z.score - a.score);
}

const WIN = 1_000_000_000;

/** 판 평가(side가 둘 차례): 다음 수 5목 · 막을 수 없는 두 곳 · 열린 4 같은 결정적 모양부터 */
function evaluate(b: Stone[], side: Stone) {
  const o = other(side);
  let myTop = 0;
  let my2 = 0;
  let oppTop = 0;
  let oppFives = 0;
  let oppWins = 0;
  for (let p = 0; p < CELLS; p += 1) {
    if (b[p] !== 0 || !nearStone(b, p, 2)) continue;
    const a = threatScore(b, p, side);
    if (a >= 100_000_000) return WIN;
    if (a > myTop) {
      my2 = myTop;
      myTop = a;
    } else if (a > my2) my2 = a;
    const d = threatScore(b, p, o);
    // 흑은 삼삼 자리를 막을 수 없음 → 그 자리의 상대 5목은 못 막는 수
    if (d >= 100_000_000)
      oppFives += side === BLACK && isDoubleThree(b, p) ? 2 : 1;
    else if (d >= 1_000_000) oppWins += 1;
    if (d > oppTop) oppTop = d;
  }
  if (oppFives >= 2) return -WIN;
  // 상대 5목 한 곳은 무조건 막아야 함(내 공격은 그다음)
  if (oppFives === 1) return -200_000 + my2 * 0.2;
  if (myTop >= 1_000_000) return WIN / 2;
  if (oppWins >= 2) return -WIN / 4;
  return myTop + my2 * 0.3 - oppTop * 0.9;
}

/** side 차례 점수(네가맥스 · 알파베타). 후보는 위협 순 상위 width개 */
function negamax(
  b: Stone[],
  side: Stone,
  depth: number,
  alpha: number,
  beta: number,
  width: number,
): number {
  if (depth <= 0) return evaluate(b, side);
  const list = rankedSharp(b, side).slice(0, width);
  if (!list.length) return 0;
  let best = -Infinity;
  for (const c of list) {
    if (c.win) return WIN;
    b[c.p] = side;
    const v = -negamax(b, other(side), depth - 1, -beta, -alpha, width);
    b[c.p] = 0;
    if (v > best) best = v;
    if (v > alpha) alpha = v;
    if (alpha >= beta) break;
  }
  return best;
}

/**
 * 요괴 AI 한 수. level 1 도깨비(실수 많음) · 2 텐구(정석) · 3 염라대왕(위협 읽기 + 한 수 앞) · 4 구미호(위협 읽기 + 두 수 앞, 함정).
 * rand: 0~1 난수(테스트에서 고정 가능)
 */
export function aiMove(
  moves: number[],
  level: AiLevel,
  rand: () => number = Math.random,
): number {
  const b = boardFrom(moves);
  const me = colorOfMove(moves.length);
  const opp = other(me);
  if (!moves.length) return 7 * SIZE + 7;
  const list = ranked(b, me, level === 1 ? 0.6 : 0.95);
  if (!list.length) return -1;
  // 바로 이기는 수
  if (list[0].win) return list[0].p;
  // 상대가 다음에 5목이면 막기(도깨비는 가끔 못 봄)
  const oppWin = candidates(b, opp).find((p) => {
    b[p] = opp;
    const w = fiveLine(b, p, opp);
    b[p] = 0;
    return w;
  });
  if (
    oppWin !== undefined &&
    (level > 1 || rand() > 0.25) &&
    list.some((c) => c.p === oppWin)
  )
    return oppWin;

  if (level === 1) {
    const top = list.slice(0, 5);
    return top[Math.floor(rand() * top.length)].p;
  }
  if (level === 2) {
    const top = list.slice(0, 2);
    return rand() < 0.75 ? top[0].p : top[top.length - 1].p;
  }
  // 3 · 4: 위협을 읽으며 몇 수 앞까지(네가맥스 + 알파베타)
  const sharp = rankedSharp(b, me);
  if (!sharp.length) return list[0].p;
  // 다음 수에 반드시 이기는 모양(열린 4 · 4-3 · 4-4)이 있고 상대 5목 위협이 없으면 바로
  if (oppWin === undefined && threatScore(b, sharp[0].p, me) >= 1_000_000)
    return sharp[0].p;
  const depth = level === 3 ? 2 : 3;
  const width = level === 3 ? 8 : 9;
  let best = sharp[0].p;
  let bestScore = -Infinity;
  for (const cand of sharp.slice(0, width + 2)) {
    b[cand.p] = me;
    const value =
      -negamax(b, opp, depth - 1, -Infinity, -bestScore, width) + rand() * 3;
    b[cand.p] = 0;
    if (value > bestScore) {
      bestScore = value;
      best = cand.p;
    }
  }
  return best;
}

/** 이 수로 4목(5목 직전)이 생겼는지 — 요괴 대사용 */
export function makesFour(moves: number[]) {
  if (!moves.length) return false;
  const b = boardFrom(moves);
  const p = moves[moves.length - 1];
  const c = b[p];
  const { x, y } = xyOf(p);
  return DIRS.some(
    ([dx, dy]) =>
      count(b, x, y, -dx, -dy, c) + count(b, x, y, dx, dy, c) + 1 === 4,
  );
}
