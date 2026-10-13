/**
 * 딜러 연습장 문제 만들기(DB 없이 계산만). 한 판 = 10문제, 맞힌 수와 걸린 시간으로 기록합니다.
 */
import { computePots, type PotPlayer, type PotResult } from "@/lib/side-pot";

export const PRACTICE_KINDS = { sidepot: "사이드팟 계산", chips: "칩 세기" } as const;
export type PracticeKind = keyof typeof PRACTICE_KINDS;
export const ROUND_SIZE = 10;

type Rand = () => number;
const pick = <T,>(rand: Rand, list: readonly T[]) => list[Math.floor(rand() * list.length)];
const between = (rand: Rand, lo: number, hi: number) => lo + Math.floor(rand() * (hi - lo + 1));

export type SidePotProblem = { players: (PotPlayer & { allIn: boolean })[]; answer: PotResult };

/** 사이드팟 문제: 3~6명, 올인 금액이 서로 달라 팟이 2~4개 생기게. 가끔 폴드한 사람·돌려줄 금액 포함 */
export function sidePotProblem(rand: Rand = Math.random): SidePotProblem {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    const n = between(rand, 3, 6);
    const unit = pick(rand, [100, 500, 1000] as const);
    const players = Array.from({ length: n }, (_, i) => ({
      name: `${i + 1}번`,
      amount: between(rand, 2, 30) * unit,
      folded: false,
      allIn: true,
    }));
    // 가장 많이 낸 사람(들)은 콜/베팅 — 올인 아님
    const max = Math.max(...players.map((p) => p.amount));
    for (const p of players) if (p.amount === max) p.allIn = false;
    // 가끔 한 명은 중간에 폴드(낸 만큼은 팟에 남음)
    if (n >= 4 && rand() < 0.45) {
      const f = players[between(rand, 0, n - 1)];
      if (f.amount < max) {
        f.folded = true;
        f.allIn = false;
      }
    }
    // 가끔 가장 많이 낸 사람이 혼자 더 베팅(콜 못 받은 금액 → 돌려줌)
    if (rand() < 0.3) {
      const top = players.find((p) => p.amount === max && !p.folded);
      if (top && players.filter((p) => p.amount === max).length >= 1) top.amount += between(rand, 1, 6) * unit;
    }
    const answer = computePots(players);
    const real = answer.pots.filter((pot) => pot.eligible.length >= 2);
    if (answer.pots.length >= 2 && answer.pots.length <= 4 && real.length === answer.pots.length) return { players, answer };
  }
  // 거의 오지 않지만 기본 문제
  const players = [
    { name: "1번", amount: 1000, folded: false, allIn: true },
    { name: "2번", amount: 3000, folded: false, allIn: true },
    { name: "3번", amount: 5000, folded: false, allIn: false },
    { name: "4번", amount: 5000, folded: false, allIn: false },
  ];
  return { players, answer: computePots(players) };
}

/** 칩 색(값별) — 화면에서 값도 같이 적어 헷갈리지 않게 */
export const CHIP_TYPES = [
  { value: 100, color: "#f4f4f5", edge: "#a1a1aa", text: "#111" },
  { value: 500, color: "#7c3aed", edge: "#c4b5fd", text: "#fff" },
  { value: 1000, color: "#facc15", edge: "#a16207", text: "#111" },
  { value: 5000, color: "#2563eb", edge: "#93c5fd", text: "#fff" },
  { value: 25000, color: "#16a34a", edge: "#86efac", text: "#fff" },
  { value: 100000, color: "#18181b", edge: "#e4e4e7", text: "#fff" },
] as const;

export type ChipsProblem = { stacks: { value: number; count: number }[]; answer: number };

/** 칩 세기 문제: 칩 종류 3~4개, 종류마다 1~18개 */
export function chipsProblem(rand: Rand = Math.random): ChipsProblem {
  const kinds = between(rand, 3, 4);
  const pool = [...CHIP_TYPES];
  const chosen: (typeof CHIP_TYPES)[number][] = [];
  while (chosen.length < kinds) chosen.push(pool.splice(Math.floor(rand() * pool.length), 1)[0]);
  chosen.sort((a, b) => a.value - b.value);
  const stacks = chosen.map((c) => ({ value: c.value, count: between(rand, 1, 18) }));
  return { stacks, answer: stacks.reduce((sum, s) => sum + s.value * s.count, 0) };
}

/** 숫자 입력 읽기("12,500" · "12500" 모두) */
export const readNumber = (text: string) => Number(String(text).replace(/[^\d]/g, "")) || 0;
