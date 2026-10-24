import { unpackSet } from "@/lib/pushfold";

/** 포지션별 푸시폴드 데이터(public/data/gto-positions.json · /info/push-fold 차트와 같은 파일) */
export type PosRow = { s: number; push: string; pushPct: number } | null;
export type PosData = {
  names: string[];
  positions: Record<string, string[]>;
  modes: Record<string, { label: string; ante: number; tables: Record<string, Record<string, PosRow[]>> }>;
};

export type QuizSpot = { size: "6" | "9"; mode: string; position: string; stack: number; hand: number };

/** 연습 문제에 쓰는 스택(너무 깊으면 푸시폴드 상황이 아님) */
export const QUIZ_STACKS = [5, 6, 7, 8, 10, 12, 15];

/** 이 자리 · 스택에서 올인이 정답인지 + 그 줄의 올인 비율 */
export function answerOf(data: PosData, spot: QuizSpot) {
  const rows = data.modes[spot.mode]?.tables[spot.size]?.[spot.position] ?? [];
  const row = rows.find((r) => r && r.s === spot.stack) ?? null;
  if (!row) return null;
  return { push: unpackSet(row.push).has(spot.hand), pushPct: row.pushPct };
}

/** 이 패를 이 자리에서 올인하는 가장 큰 스택(차트 숫자 보기와 같은 방식) */
export function maxPushStack(data: PosData, spot: Omit<QuizSpot, "stack">) {
  let best = 0;
  for (const r of data.modes[spot.mode]?.tables[spot.size]?.[spot.position] ?? []) if (r && unpackSet(r.push).has(spot.hand)) best = Math.max(best, r.s);
  return best;
}

/**
 * 문제 고르기: 절반은 경계에 가까운 패(올인 한계 스택이 문제 스택 ±3bb), 나머지는 아무 패.
 * rand는 테스트에서 고정값을 넣을 수 있게 받음.
 */
export function pickSpot(data: PosData, rand: () => number = Math.random): QuizSpot {
  const size: "6" | "9" = rand() < 0.5 ? "6" : "9";
  const modes = Object.keys(data.modes);
  const mode = modes[Math.floor(rand() * modes.length)] ?? modes[0];
  const pushers = (data.positions[size] ?? []).slice(0, -1);
  const position = pushers[Math.floor(rand() * pushers.length)] ?? "BTN";
  const stack = QUIZ_STACKS[Math.floor(rand() * QUIZ_STACKS.length)];
  const all = data.names.map((_, i) => i);
  let pool = all;
  if (rand() < 0.5) {
    const near = all.filter((hand) => Math.abs(maxPushStack(data, { size, mode, position, hand }) - stack) <= 3);
    if (near.length) pool = near;
  }
  const hand = pool[Math.floor(rand() * pool.length)] ?? 0;
  return { size, mode, position, stack, hand };
}
