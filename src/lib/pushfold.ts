/**
 * 헤즈업 푸시/폴드 내시 차트(미리 계산한 값).
 * scripts/pushfold: 169×169 프리플랍 승률표(몬테카를로) → 0.1bb마다 SB 올인 · BB 콜 내시 균형.
 */
export type PushFoldRow = { s: number; push: string; call: string; pushPct: number; callPct: number } | null;
export type PushFoldData = {
  generatedFrom: string;
  names: string[];
  stacks: number[];
  modes: Record<string, { label: string; ante: number; rows: PushFoldRow[] }>;
};

export const GRID_RANKS = "AKQJT98765432";

/** 16진 비트 문자열 → 들어 있는 패 번호 */
export function unpackSet(hex: string): Set<number> {
  const set = new Set<number>();
  for (let w = 0; w < 6; w++) {
    const x = parseInt(hex.slice(w * 8, w * 8 + 8), 16);
    for (let b = 0; b < 32; b++) if (x & (1 << b)) set.add(w * 32 + b);
  }
  return set;
}

/** 표에서 가장 가까운 스택 줄(0.1bb 단위) */
export function rowAt(data: PushFoldData, mode: string, stack: number) {
  const rows = data.modes[mode]?.rows ?? [];
  let best: PushFoldRow = null;
  for (const row of rows) {
    if (!row) continue;
    if (!best || Math.abs(row.s - stack) < Math.abs(best.s - stack)) best = row;
  }
  return best;
}

/**
 * 패마다 "이 스택까지 올인/콜"(가장 큰 스택). 25bb에서도 하면 25(+).
 * 내시 차트는 스택이 커질수록 범위가 줄지만, 몇몇 패는 중간에 빠졌다 다시 들어가기도 해서(비단조) 가장 큰 값을 씁니다.
 */
export function thresholds(data: PushFoldData, mode: string, key: "push" | "call") {
  const out = new Array<number>(169).fill(0);
  for (const row of data.modes[mode]?.rows ?? []) {
    if (!row) continue;
    for (const k of unpackSet(row[key])) out[k] = Math.max(out[k], row.s);
  }
  return out;
}

export const COMBOS = (name: string) => (name.length === 2 ? 6 : name.endsWith("s") ? 4 : 12);
