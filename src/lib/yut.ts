/**
 * 요괴 윷놀이 규칙(화면 · 서버 · AI 공통). 베팅 없는 순수 민속 놀이.
 *
 * 판(29칸): 바깥 20칸 + 대각선 8칸 + 가운데(방).
 *  - 바깥: o0(참먹이 · 출발/도착 모서리) → o1…o4 → o5(오른쪽 위 모서리) → o6…o9 → o10(왼쪽 위) → o11…o14 → o15(왼쪽 아래) → o16…o19 → 도착
 *  - 지름길: o5에 멈추면 a1 · a2 · c(방) · a3 · a4 → o15 / o10에 멈추면 b1 · b2 · c · b3 · b4 → 도착 / c에 멈추면 b3 · b4 → 도착
 * 윷: 도1 · 개2 · 걸3 · 윷4 · 모5 · 빽도(-1, 한 칸 뒤로). 윷 · 모 · 잡기는 한 번 더 던짐.
 * 내 팀 말이 같은 칸이면 업기(같이 움직임), 상대 말이 있는 칸에 서면 잡기(상대 말은 출발로).
 * 도착 모서리에 닿거나 지나가면 그 말은 완주. 팀 말이 모두 완주하면 승리.
 */
export type Team = "A" | "B";
export type Piece = { pos: string };
/** 출발 전 · 완주 */
export const START = "start";
export const END = "end";
export const other = (t: Team): Team => (t === "A" ? "B" : "A");

export const YUT_NAMES: Record<number, string> = { [-1]: "빽도", 0: "낙", 1: "도", 2: "개", 3: "걸", 4: "윷", 5: "모" };

const OUTER = [START, ...Array.from({ length: 19 }, (_, i) => `o${i + 1}`), END];
const ROUTE_A = ["o5", "a1", "a2", "c", "a3", "a4", "o15", "o16", "o17", "o18", "o19", END];
const ROUTE_B = ["o10", "b1", "b2", "c", "b3", "b4", END];
const ROUTE_C = ["c", "b3", "b4", END];

/** 이 칸에서 출발할 때 따라갈 길 */
function routeFrom(pos: string): string[] {
  if (pos === "o5") return ROUTE_A;
  if (pos === "o10") return ROUTE_B;
  if (pos === "c") return ROUTE_C;
  if (pos.startsWith("a")) return ROUTE_A;
  if (pos.startsWith("b")) return ROUTE_B;
  return OUTER;
}

/** 한 칸 뒤(빽도) */
const BACK: Record<string, string> = {
  o1: START,
  a1: "o5",
  a2: "a1",
  c: "a2",
  a3: "c",
  a4: "a3",
  b1: "o10",
  b2: "b1",
  b3: "c",
  b4: "b3",
};
function backOf(pos: string) {
  if (BACK[pos]) return BACK[pos];
  const n = Number(pos.slice(1));
  return `o${n - 1}`;
}

/** pos에서 steps만큼(빽도 -1) 간 칸. 출발 전 말은 빽도로 못 움직임(null) */
export function dest(pos: string, steps: number): string | null {
  if (pos === END) return null;
  if (steps < 0) return pos === START ? null : backOf(pos);
  const route = routeFrom(pos);
  const i = route.indexOf(pos);
  const j = i + steps;
  return j >= route.length - 1 ? END : route[j];
}

/** 지나가는 칸들(애니메이션용, 도착 칸 포함) */
export function pathOf(pos: string, steps: number): string[] {
  if (steps < 0) return [dest(pos, steps) ?? pos];
  const route = routeFrom(pos);
  const i = route.indexOf(pos);
  const out: string[] = [];
  for (let k = 1; k <= steps; k += 1) {
    const p = route[Math.min(i + k, route.length - 1)];
    out.push(p);
    if (p === END) break;
  }
  return out;
}

/** 윷 던지기: 막대 4개(앞면 = true). 첫 막대 뒷면 표시(빽도) */
export function throwYut(rand: () => number = Math.random): { sticks: boolean[]; value: number } {
  const sticks = [0, 1, 2, 3].map(() => rand() < 0.5);
  const flats = sticks.filter(Boolean).length;
  const value = flats === 0 ? 5 : flats === 1 ? (sticks[0] ? -1 : 1) : flats;
  return { sticks, value };
}
export const throwAgain = (value: number) => value === 4 || value === 5;

export type YutState = {
  pieces: Record<Team, Piece[]>;
  turnTeam: Team;
  /** 팀마다 다음에 던질 사람 순번 */
  turnIdx: Record<Team, number>;
  phase: "throw" | "move";
  /** 아직 쓰지 않은 윷 결과 */
  results: number[];
  /** 남은 던지기 횟수 */
  throws: number;
  /** 마지막 던지기 · 일어난 일(화면 연출) */
  /** value 0 = 낙(윷가락이 판 밖으로) · power = 던진 세기 0~100(연출만) */
  lastThrow: { sticks: boolean[]; value: number; team: Team; at: number; power?: number } | null;
  /** path = 밟고 간 칸(한 칸씩 연출) · moved = 움직인 말 번호 · nak = 낙으로 차례 넘김 */
  event: { type: "move" | "capture" | "stack" | "finish" | "skip"; team: Team; from: string; to: string; count: number; at: number; captured?: number; path?: string[]; moved?: number[]; nak?: boolean } | null;
  winner: Team | null;
  /** 말을 움직인 횟수(짧은 판 판정) */
  movesMade: number;
};

export function newState(piecesPerTeam: number, first: Team = "A"): YutState {
  const mk = () => Array.from({ length: piecesPerTeam }, () => ({ pos: START }));
  return { pieces: { A: mk(), B: mk() }, turnTeam: first, turnIdx: { A: 0, B: 0 }, phase: "throw", results: [], throws: 1, lastThrow: null, event: null, winner: null, movesMade: 0 };
}

/** 이 결과로 움직일 수 있는 말(같은 칸에 업힌 말은 대표 하나만) */
export function movablePieces(s: YutState, team: Team, value: number): number[] {
  const seen = new Set<string>();
  const out: number[] = [];
  s.pieces[team].forEach((p, i) => {
    if (p.pos === END) return;
    if (dest(p.pos, value) === null) return;
    // 출발 전 말은 하나만 고를 수 있게(어느 것이든 같음)
    const key = p.pos;
    if (seen.has(key)) return;
    seen.add(key);
    out.push(i);
  });
  return out;
}

export function hasAnyMove(s: YutState, team: Team) {
  return s.results.some((v) => movablePieces(s, team, v).length > 0);
}

/** 낙(윷가락이 판 밖으로 떨어짐) 확률 — 그 던지기는 없던 일 */
export const NAK_RATE = 0.04;

/** 던지기(power: 화면 게이지 세기 · 결과에는 영향 없음) */
export function applyThrow(s: YutState, rand: () => number = Math.random, now = Date.now(), power?: number): YutState {
  if (s.winner || s.phase !== "throw" || s.throws <= 0) return s;
  const t = throwYut(rand);
  const nak = rand() < NAK_RATE;
  const pw = power === undefined ? undefined : Math.max(0, Math.min(100, Math.round(power)));
  if (nak) {
    const n: YutState = { ...s, lastThrow: { sticks: t.sticks, value: 0, team: s.turnTeam, at: now, power: pw }, throws: s.throws - 1 };
    if (n.throws > 0) return n;
    if (!n.results.length || !hasAnyMove({ ...n, phase: "move" }, n.turnTeam)) return endTurn({ ...n, results: [], event: { type: "skip", team: n.turnTeam, from: START, to: START, count: 0, at: now, nak: true } });
    return { ...n, phase: "move" };
  }
  const next: YutState = { ...s, results: [...s.results, t.value], lastThrow: { ...t, team: s.turnTeam, at: now, power: pw }, throws: s.throws - 1 + (throwAgain(t.value) ? 1 : 0) };
  if (next.throws <= 0) {
    next.phase = "move";
    // 쓸 수 있는 결과가 하나도 없으면(예: 출발 전 말뿐인데 빽도) 차례 넘김
    if (!hasAnyMove(next, next.turnTeam)) return endTurn({ ...next, event: { type: "skip", team: next.turnTeam, from: START, to: START, count: 0, at: now } });
  }
  return next;
}

function endTurn(s: YutState): YutState {
  const t = s.turnTeam;
  return { ...s, results: [], throws: 1, phase: "throw", turnTeam: other(t), turnIdx: { ...s.turnIdx, [t]: s.turnIdx[t] + 1 } };
}

/** 말 움직이기: results[ri]로 piece(대표)를 — 같은 칸 우리 말은 업혀서 같이 */
export function applyMove(s: YutState, ri: number, pieceIdx: number, now = Date.now()): { ok: true; state: YutState } | { ok: false; error: string } {
  if (s.winner) return { ok: false, error: "끝난 판이에요." };
  if (s.phase !== "move") return { ok: false, error: "먼저 윷을 던져요." };
  const value = s.results[ri];
  if (value === undefined) return { ok: false, error: "쓸 윷 결과를 골라 주세요." };
  const team = s.turnTeam;
  const mine = s.pieces[team];
  const piece = mine[pieceIdx];
  if (!piece || piece.pos === END) return { ok: false, error: "움직일 수 없는 말이에요." };
  const to = dest(piece.pos, value);
  if (to === null) return { ok: false, error: "그 말은 이 결과로 움직일 수 없어요." };
  const from = piece.pos;
  // 같은 칸 우리 말(출발 전 말은 하나만)
  const group = from === START ? [pieceIdx] : mine.map((p, i) => (p.pos === from ? i : -1)).filter((i) => i >= 0);
  const pieces = { A: s.pieces.A.map((p) => ({ ...p })), B: s.pieces.B.map((p) => ({ ...p })) };
  for (const i of group) pieces[team][i].pos = to;
  let captured = 0;
  let type: NonNullable<YutState["event"]>["type"] = to === END ? "finish" : "move";
  if (to !== END && to !== START) {
    const opp = other(team);
    pieces[opp].forEach((p) => {
      if (p.pos === to) {
        p.pos = START;
        captured += 1;
      }
    });
    if (captured) type = "capture";
    else if (pieces[team].filter((p) => p.pos === to).length > group.length) type = "stack";
  }
  const results = s.results.filter((_, i) => i !== ri);
  let next: YutState = {
    ...s,
    pieces,
    results,
    throws: s.throws + (captured ? 1 : 0),
    event: { type, team, from, to, count: group.length, at: now, captured, path: pathOf(from, value), moved: group },
    movesMade: s.movesMade + 1,
  };
  if (pieces[team].every((p) => p.pos === END)) return { ok: true, state: { ...next, winner: team, results: [], throws: 0 } };
  // 잡으면 한 번 더 던지기 → 남은 결과는 그다음에
  if (next.throws > 0) next = { ...next, phase: "throw" };
  else if (!results.length || !hasAnyMove(next, team)) next = endTurn(next);
  return { ok: true, state: next };
}

/* ───────── 요괴 AI(시간 초과 · 나간 사람 · 요괴 봇) ───────── */

/** 상대 말이 1~5칸 뒤에서 이 칸을 노리는지(대략) */
function danger(s: YutState, team: Team, pos: string) {
  if (pos === END || pos === START) return 0;
  let d = 0;
  for (const p of s.pieces[other(team)]) {
    if (p.pos === END) continue;
    for (const v of [1, 2, 3, 4, 5]) if (dest(p.pos, v) === pos) d += v <= 3 ? 2 : 1;
  }
  return d;
}

const PROGRESS: Record<string, number> = (() => {
  // 도착까지 남은 칸 수가 적을수록 큼
  const out: Record<string, number> = { [START]: 0, [END]: 30 };
  OUTER.slice(1, -1).forEach((p, i) => (out[p] = i + 1));
  ["a1", "a2", "c", "a3", "a4"].forEach((p, i) => (out[p] = 6 + i + 4));
  ["b1", "b2", "b3", "b4"].forEach((p, i) => (out[p] = 11 + i + 5 + (i >= 2 ? 1 : 0)));
  return out;
})();

/** 가장 좋아 보이는 수: [결과 번호, 말 번호] */
export function bestMove(s: YutState): [number, number] | null {
  const team = s.turnTeam;
  let best: [number, number] | null = null;
  let bestScore = -Infinity;
  s.results.forEach((v, ri) => {
    for (const pi of movablePieces(s, team, v)) {
      const from = s.pieces[team][pi].pos;
      const to = dest(from, v)!;
      const stackSize = from === START ? 1 : s.pieces[team].filter((p) => p.pos === from).length;
      let score = (PROGRESS[to] ?? 0) - (PROGRESS[from] ?? 0);
      if (to === END) score += 40 * stackSize;
      if (to !== END && s.pieces[other(team)].some((p) => p.pos === to)) score += 60;
      if (to !== END && s.pieces[team].some((p, i) => p.pos === to && i !== pi)) score += 12;
      if (to === "o5" || to === "o10" || to === "c") score += 8;
      score -= danger(s, team, to) * 6 * stackSize;
      score += danger(s, team, from) * 4 * stackSize;
      if (score > bestScore) {
        bestScore = score;
        best = [ri, pi];
      }
    }
  });
  return best;
}

/** 지금 차례를 AI가 한 단계 진행(던지기 또는 움직이기) */
export function autoStep(s: YutState, rand: () => number = Math.random, now = Date.now()): YutState {
  if (s.winner) return s;
  if (s.phase === "throw") return applyThrow(s, rand, now, 30 + Math.floor(rand() * 60));
  const m = bestMove(s);
  if (!m) return endTurn(s);
  const r = applyMove(s, m[0], m[1], now);
  return r.ok ? r.state : endTurn(s);
}

/** 판 그림 좌표(0~100) */
export const NODE_XY: Record<string, [number, number]> = (() => {
  const xy: Record<string, [number, number]> = {};
  const L = 8;
  const R = 92;
  const step = (R - L) / 5;
  xy.o0 = [R, R];
  for (let k = 1; k <= 4; k += 1) xy[`o${k}`] = [R, R - step * k];
  xy.o5 = [R, L];
  for (let k = 1; k <= 4; k += 1) xy[`o${5 + k}`] = [R - step * k, L];
  xy.o10 = [L, L];
  for (let k = 1; k <= 4; k += 1) xy[`o${10 + k}`] = [L, L + step * k];
  xy.o15 = [L, R];
  for (let k = 1; k <= 4; k += 1) xy[`o${15 + k}`] = [L + step * k, R];
  const mid = 50;
  const lerp = (a: [number, number], b: [number, number], t: number): [number, number] => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  xy.c = [mid, mid];
  xy.a1 = lerp(xy.o5, xy.c, 1 / 3);
  xy.a2 = lerp(xy.o5, xy.c, 2 / 3);
  xy.a3 = lerp(xy.c, xy.o15, 1 / 3);
  xy.a4 = lerp(xy.c, xy.o15, 2 / 3);
  xy.b1 = lerp(xy.o10, xy.c, 1 / 3);
  xy.b2 = lerp(xy.o10, xy.c, 2 / 3);
  xy.b3 = lerp(xy.c, xy.o0, 1 / 3);
  xy.b4 = lerp(xy.c, xy.o0, 2 / 3);
  return xy;
})();
export const BIG_NODES = ["o0", "o5", "o10", "o15", "c"];
