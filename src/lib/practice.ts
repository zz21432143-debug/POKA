/**
 * 딜러 연습장 — 팟 계산 문제 만들기(DB 없이 계산만). 한 판 = 10문제, 맞힌 수와 걸린 시간으로 기록합니다.
 *
 * 프리플랍 올인 상황: 테이블(4~9명)에 포지션 이름(BTN·SB·BB·UTG…)을 붙이고
 * 올인한 사람마다 금액이 달라 메인 · 세컨 · 서드 · 포스 · 피프스 팟(2~5개)이 생깁니다.
 * 블라인드(SB·BB)와 BB 앤티는 사용자가 정합니다. 폴드한 블라인드·레이즈 후 폴드한 금액은 팟에 남고, 앤티는 메인 팟에 들어갑니다.
 */
import { computePots, type PotPlayer, type PotResult } from "@/lib/side-pot";

export const PRACTICE_KINDS = { sidepot: "팟 계산" } as const;
export type PracticeKind = keyof typeof PRACTICE_KINDS;
export const ROUND_SIZE = 10;

export type Blinds = { sb: number; bb: number; ante: number };
export const DEFAULT_BLINDS: Blinds = { sb: 500, bb: 1000, ante: 0 };

/** 블라인드 입력 확인: SB ≤ BB, 0보다 큼, 앤티는 0 이상 */
export function validBlinds(b: Blinds) {
  return Number.isFinite(b.sb) && Number.isFinite(b.bb) && b.sb > 0 && b.bb >= b.sb && b.bb <= 10_000_000 && b.ante >= 0 && b.ante <= b.bb * 10;
}

/** 테이블 인원별 포지션(버튼부터 시계 방향) */
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

export type SeatAction = "allin" | "bet" | "call" | "fold";
export type Seat = { position: string; amount: number; action: SeatAction; /** 레이즈 후 폴드 등 설명 */ note?: string };
export type PotProblem = { seats: Seat[]; blinds: Blinds; players: PotPlayer[]; answer: PotResult };

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

/** 팟 계산 문제: 팟 2~5개(메인~피프스), 금액은 BB 단위 */
export function potProblem(blinds: Blinds = DEFAULT_BLINDS, rand: Rand = Math.random): PotProblem {
  const { sb, bb, ante } = validBlinds(blinds) ? blinds : DEFAULT_BLINDS;
  for (let attempt = 0; attempt < 300; attempt += 1) {
    const potCount = between(rand, 2, 5);
    const allIns = potCount - 1;
    const n = between(rand, Math.max(4, allIns + 2), 9);
    const names = positionNames(n);
    // 서로 다른 금액(BB 3~120배): 올인 금액들 + 맨 위(베팅·콜)
    const pool = shuffle(
      rand,
      Array.from({ length: 118 }, (_, i) => i + 3),
    )
      .slice(0, allIns + 1)
      .sort((a, b) => a - b)
      .map((x) => x * bb);
    const top = pool[allIns];
    const seatsIdx = shuffle(rand, names.map((_, i) => i));
    const active = seatsIdx.slice(0, allIns + 2);
    const seats: Seat[] = names.map((position) => ({ position, amount: 0, action: "fold" }));
    active.slice(0, allIns).forEach((s, j) => {
      seats[s] = { position: names[s], amount: pool[j], action: "allin" };
    });
    const refund = rand() < 0.3 ? between(rand, 1, 20) * bb : 0;
    seats[active[allIns]] = { position: names[active[allIns]], amount: top + refund, action: "bet" };
    seats[active[allIns + 1]] = { position: names[active[allIns + 1]], amount: top, action: "call" };
    // 폴드한 사람: 블라인드는 낸 만큼, 가끔 레이즈 후 폴드(데드 머니)
    seats.forEach((seat, i) => {
      if (seat.action !== "fold") return;
      if (seat.position === "SB") seat.amount = sb;
      else if (seat.position === "BB") seat.amount = bb;
      if (rand() < 0.2 && pool[0] > 3 * bb) {
        const raise = between(rand, 2, Math.max(2, Math.floor(pool[0] / bb) - 1)) * bb;
        if (raise > seat.amount && raise < top) {
          seat.amount = raise;
          seat.note = "레이즈 후 폴드";
        }
      }
      seats[i] = seat;
    });
    const players: PotPlayer[] = seats.map((s) => ({ name: s.position, amount: s.amount, folded: s.action === "fold" }));
    const answer = computePots(players, { deadMain: ante });
    if (answer.pots.length === potCount && answer.pots.every((p) => p.eligible.length >= 2)) {
      return { seats, blinds: { sb, bb, ante }, players, answer };
    }
  }
  // 거의 오지 않지만 기본 문제
  const seats: Seat[] = [
    { position: "BTN", amount: 10 * bb, action: "allin" },
    { position: "SB", amount: sb, action: "fold" },
    { position: "BB", amount: 30 * bb, action: "call" },
    { position: "UTG", amount: 30 * bb, action: "bet" },
  ];
  const players = seats.map((s) => ({ name: s.position, amount: s.amount, folded: s.action === "fold" }));
  return { seats, blinds: { sb, bb, ante }, players, answer: computePots(players, { deadMain: ante }) };
}

/** 숫자 입력 읽기("12,500" · "12500" 모두) */
export const readNumber = (text: string) => Number(String(text).replace(/[^\d]/g, "")) || 0;
