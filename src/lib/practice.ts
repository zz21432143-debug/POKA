/**
 * 딜러 연습장 — 팟 계산 문제 만들기(DB 없이 계산만). 한 판 = 10문제, 맞힌 수와 걸린 시간으로 기록합니다.
 *
 * 9인 테이블에서 프리플랍 한 바퀴를 실제로 진행시켜 문제를 만듭니다.
 * 블라인드 → UTG부터 차례로 폴드 · 체크 · 콜 · 레이즈 · 올인(레이즈했다가 폴드도) → 액션이 끝나면
 * 각자 낸 칩으로 메인 · 세컨 · 서드 · 포스 · 피프스 팟을 계산합니다.
 * 난이도(쉬움·보통·어려움)에 따라 참여 인원, 팟 개수, 금액 단위, 레이즈 후 폴드가 달라집니다.
 * 블라인드(SB · BB)와 BB 앤티는 사용자가 정합니다. 앤티는 메인 팟에 들어갑니다.
 */
import { computePots, type PotPlayer, type PotResult } from "@/lib/side-pot";

export const ROUND_SIZE = 10;

export type Difficulty = "easy" | "normal" | "hard";
export const DIFFICULTY: Record<
  Difficulty,
  { label: string; desc: string; active: [number, number]; pots: [number, number]; raiseFold: number; speed: number }
> = {
  easy: { label: "쉬움", desc: "3명 참여 · 팟 2개 · 금액이 딱 떨어짐", active: [3, 3], pots: [2, 2], raiseFold: 0, speed: 1100 },
  normal: { label: "보통", desc: "3~5명 · 팟 2~3개 · 가끔 레이즈 후 폴드·돌려줄 금액", active: [3, 5], pots: [2, 3], raiseFold: 0.12, speed: 850 },
  hard: { label: "어려움", desc: "4~7명 · 팟 3~5개 · 잔돈 금액 · 레이즈 후 폴드 자주", active: [4, 7], pots: [3, 5], raiseFold: 0.3, speed: 650 },
};
export const DIFFICULTIES = Object.keys(DIFFICULTY) as Difficulty[];
/** 기록 종류(난이도별 랭킹) */
export const kindOf = (d: Difficulty) => `sidepot-${d}`;
export const PRACTICE_KINDS = Object.fromEntries(DIFFICULTIES.map((d) => [kindOf(d), `팟 계산 · ${DIFFICULTY[d].label}`])) as Record<string, string>;

export type Blinds = { sb: number; bb: number; ante: number };
export const DEFAULT_BLINDS: Blinds = { sb: 500, bb: 1000, ante: 0 };

/** 블라인드 입력 확인: SB ≤ BB, 0보다 큼, 앤티는 0 이상 */
export function validBlinds(b: Blinds) {
  return Number.isFinite(b.sb) && Number.isFinite(b.bb) && b.sb > 0 && b.bb >= b.sb && b.bb <= 10_000_000 && b.ante >= 0 && b.ante <= b.bb * 10;
}

/** 9인 테이블 포지션(버튼부터 시계 방향) */
export const POSITIONS_9 = ["BTN", "SB", "BB", "UTG", "UTG+1", "MP", "LJ", "HJ", "CO"] as const;
/** 테이블 인원별 포지션(버튼부터 시계 방향) — 사이드팟 계산기 등에서 */
const MIDDLE: Record<number, string[]> = {
  3: [],
  4: ["CO"],
  5: ["UTG", "CO"],
  6: ["UTG", "HJ", "CO"],
  7: ["UTG", "LJ", "HJ", "CO"],
  8: ["UTG", "UTG+1", "LJ", "HJ", "CO"],
  9: ["UTG", "UTG+1", "MP", "LJ", "HJ", "CO"],
};
export function positionNames(n: number) {
  return ["BTN", "SB", "BB", ...(MIDDLE[n] ?? MIDDLE[9])];
}

export type ActionType = "sb" | "bb" | "ante" | "fold" | "check" | "call" | "raise" | "allin";
/** 액션 하나: 누가(좌석) 무엇을, 이 액션 뒤 그 사람이 낸 합계(to) */
export type PlayAction = { seat: number; type: ActionType; to: number };
export type SeatAction = "allin" | "bet" | "call" | "fold";
export type Seat = { seat: number; position: string; stack: number; amount: number; action: SeatAction; note?: string };
export type PotProblem = {
  difficulty: Difficulty;
  seats: Seat[];
  button: number;
  actions: PlayAction[];
  blinds: Blinds;
  players: PotPlayer[];
  answer: PotResult;
};

type Rand = () => number;
const between = (rand: Rand, lo: number, hi: number) => lo + Math.floor(rand() * (hi - lo + 1));
function shuffle<T>(rand: Rand, list: T[]) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** 프리플랍 한 바퀴 진행(문제 하나 후보) */
function simulate(difficulty: Difficulty, blinds: Blinds, rand: Rand): PotProblem | null {
  const { sb, bb, ante } = blinds;
  const conf = DIFFICULTY[difficulty];
  const N = 9;
  const button = between(rand, 0, N - 1);
  const pos = (s: number) => POSITIONS_9[(s - button + N) % N];
  const seatOf = (offset: number) => (button + offset) % N;
  // 금액 단위: 쉬움은 5BB 단위, 보통은 BB 단위, 어려움은 SB 단위(잔돈)
  const unit = difficulty === "easy" ? bb * 5 : difficulty === "normal" ? bb : sb;
  const roundUp = (x: number) => Math.ceil(x / unit) * unit;

  const activeCount = between(rand, conf.active[0], conf.active[1]);
  const active = new Set(shuffle(rand, [...Array(N).keys()]).slice(0, activeCount));
  const raiseFold = new Set([...Array(N).keys()].filter((s) => !active.has(s) && rand() < conf.raiseFold));
  // 스택: 참여자는 서로 다르게(짧은 스택이 올인해 사이드팟이 생기게)
  const stacks = [...Array(N).keys()].map((s) => {
    if (active.has(s)) return roundUp(between(rand, difficulty === "easy" ? 2 : 4, difficulty === "hard" ? 160 : 120) * (difficulty === "easy" ? bb * 5 : bb) + (difficulty === "hard" ? between(rand, 0, 9) * sb : 0));
    return between(rand, 30, 200) * bb;
  });

  const contrib = Array(N).fill(0);
  const folded = Array(N).fill(false);
  const allin = Array(N).fill(false);
  const raised = Array(N).fill(false);
  const actions: PlayAction[] = [];
  const put = (s: number, to: number, type: ActionType) => {
    const capped = Math.min(to, stacks[s]);
    contrib[s] = capped;
    if (capped >= stacks[s]) allin[s] = true;
    actions.push({ seat: s, type: allin[s] && type !== "sb" && type !== "bb" ? "allin" : type, to: capped });
  };
  const sbSeat = seatOf(1);
  const bbSeat = seatOf(2);
  put(sbSeat, sb, "sb");
  put(bbSeat, bb, "bb");
  if (ante > 0) actions.push({ seat: bbSeat, type: "ante", to: contrib[bbSeat] });

  let cb = bb;
  let minRaise = bb;
  let raises = 0;
  let lastRaiser = bbSeat;
  const need = new Set([...Array(N).keys()].filter((s) => !allin[s]));
  let p = seatOf(3);
  for (let guard = 0; guard < 200 && need.size; guard += 1, p = (p + 1) % N) {
    if (!need.has(p) || folded[p] || allin[p]) {
      need.delete(p);
      continue;
    }
    need.delete(p);
    const toCall = cb - contrib[p];
    const reopen = (to: number) => {
      if (to > cb) {
        minRaise = Math.max(minRaise, to - cb);
        cb = to;
        raises += 1;
        lastRaiser = p;
        for (let s = 0; s < N; s += 1) if (s !== p && !folded[s] && !allin[s]) need.add(s);
      }
    };
    if (!active.has(p)) {
      // 들어오지 않는 사람: 가끔 먼저 레이즈했다가 다음 레이즈에 폴드
      if (raiseFold.has(p) && !raised[p] && raises < 2) {
        const to = Math.min(roundUp(cb + Math.max(minRaise, cb)), Math.floor(stacks[p] / 2));
        if (to > cb) {
          raised[p] = true;
          put(p, to, "raise");
          reopen(to);
          continue;
        }
      }
      if (toCall === 0) {
        actions.push({ seat: p, type: "check", to: contrib[p] });
        // 체크한 BB는 계속 남지만, 참여자가 레이즈하면 다음에 폴드합니다.
        need.delete(p);
        continue;
      }
      folded[p] = true;
      actions.push({ seat: p, type: "fold", to: contrib[p] });
      continue;
    }
    // 참여자: 스택이 모자라면 올인, 아니면 레이즈 · 올인 · 콜
    if (stacks[p] <= cb) {
      put(p, stacks[p], "allin");
      reopen(contrib[p]);
      continue;
    }
    const r = rand();
    if (raises < 4 && r < 0.45) {
      const target = roundUp(cb + Math.max(minRaise, Math.round(cb * (0.8 + rand() * 1.5))));
      if (target >= stacks[p] || rand() < 0.45) put(p, stacks[p], "allin");
      else put(p, target, "raise");
      reopen(contrib[p]);
      continue;
    }
    if (toCall === 0) actions.push({ seat: p, type: "check", to: contrib[p] });
    else put(p, cb, "call");
  }
  // 체크한 채 남은 비참여자(BB 등)는 레이즈를 받았으면 폴드로 정리됐어야 함 → 남은 사람이 참여자뿐인지
  const live = [...Array(N).keys()].filter((s) => !folded[s]);
  if (live.some((s) => !active.has(s))) return null;
  if (live.length < 2) return null;

  const seats: Seat[] = [...Array(N).keys()].map((s) => {
    const action: SeatAction = folded[s] ? "fold" : allin[s] ? "allin" : s === lastRaiser && contrib[s] === Math.max(...contrib) ? "bet" : "call";
    return { seat: s, position: pos(s), stack: stacks[s], amount: contrib[s], action, note: folded[s] && raised[s] ? "레이즈 후 폴드" : undefined };
  });
  const players: PotPlayer[] = seats.map((s) => ({ name: s.position, amount: s.amount, folded: s.action === "fold" }));
  const answer = computePots(players, { deadMain: ante });
  return { difficulty, seats, button, actions, blinds, players, answer };
}

/** 팟 계산 문제: 난이도에 맞는 팟 개수(메인~피프스)가 나올 때까지 진행 */
export function potProblem(difficulty: Difficulty = "normal", blinds: Blinds = DEFAULT_BLINDS, rand: Rand = Math.random): PotProblem {
  const b = validBlinds(blinds) ? blinds : DEFAULT_BLINDS;
  const conf = DIFFICULTY[difficulty];
  let fallback: PotProblem | null = null;
  for (let attempt = 0; attempt < 3000; attempt += 1) {
    const q = simulate(difficulty, b, rand);
    if (!q) continue;
    const n = q.answer.pots.length;
    const ok = n >= conf.pots[0] && n <= conf.pots[1] && q.answer.pots.every((pot) => pot.eligible.length >= 2);
    if (ok) {
      // 쉬움: 돌려줄 금액·레이즈 후 폴드 없는 문제만
      if (difficulty === "easy" && (q.answer.refund || q.seats.some((s) => s.note))) continue;
      return q;
    }
    if (!fallback && n >= 2 && q.answer.pots.every((pot) => pot.eligible.length >= 2)) fallback = q;
  }
  return fallback ?? (simulate(difficulty, b, rand) as PotProblem);
}

/** 액션 글자: "레이즈 6,000" 등 */
export function actionText(a: PlayAction, blinds: Blinds) {
  const won = (n: number) => Math.round(n).toLocaleString("ko-KR");
  switch (a.type) {
    case "sb":
      return `SB ${won(a.to)}`;
    case "bb":
      return `BB ${won(a.to)}`;
    case "ante":
      return `앤티 ${won(blinds.ante)}`;
    case "fold":
      return "폴드";
    case "check":
      return "체크";
    case "call":
      return `콜 ${won(a.to)}`;
    case "raise":
      return `레이즈 ${won(a.to)}`;
    case "allin":
      return `올인 ${won(a.to)}`;
  }
}

/** 숫자 입력 읽기("12,500" · "12500" 모두) */
export const readNumber = (text: string) => Number(String(text).replace(/[^\d]/g, "")) || 0;
