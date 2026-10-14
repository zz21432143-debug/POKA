import raw from "@/lib/data/hand-ranking.json";

/**
 * 169개 시작 패 순위(쇼다운까지 갔을 때 승률 · 무승부는 나눠 계산).
 * 상대 1명: 승률표(쌍마다 30만 판)의 정확한 가중 평균 · 2·5·8명: 패마다 20만 판 몬테카를로.
 */
export type Opponents = "1" | "2" | "5" | "8";
export const OPPONENT_OPTIONS: { key: Opponents; label: string }[] = [
  { key: "1", label: "상대 1명" },
  { key: "2", label: "2명" },
  { key: "5", label: "5명" },
  { key: "8", label: "8명(풀링)" },
];

const data = raw as { names: string[]; vs: Record<Opponents, number[]> };
export const HAND_NAMES = data.names;
export const handCombos = (name: string) => (name.length === 2 ? 6 : name.endsWith("s") ? 4 : 12);

export type Ranking = {
  /** 강한 순서대로 패 번호 */
  order: number[];
  /** 패 번호 → 순위(1부터) */
  rank: number[];
  /** 패 번호 → 그 패까지 포함한 누적 상위 %(1,326조합 기준) */
  topPct: number[];
  equity: number[];
};

const cache = new Map<Opponents, Ranking>();
export function ranking(opponents: Opponents = "1"): Ranking {
  const hit = cache.get(opponents);
  if (hit) return hit;
  const equity = data.vs[opponents];
  const order = HAND_NAMES.map((_, i) => i).sort((a, b) => equity[b] - equity[a]);
  const rank = new Array<number>(169);
  const topPct = new Array<number>(169);
  let cum = 0;
  order.forEach((h, i) => {
    rank[h] = i + 1;
    cum += handCombos(HAND_NAMES[h]);
    topPct[h] = (cum / 1326) * 100;
  });
  const out = { order, rank, topPct, equity };
  cache.set(opponents, out);
  return out;
}

/** 상위 pct% 범위에 드는 패 번호(누적 조합이 pct를 넘지 않는 데까지, 최소 1개) */
export function topRange(pct: number, opponents: Opponents = "1"): Set<number> {
  const { order, topPct } = ranking(opponents);
  const set = new Set<number>();
  for (const h of order) {
    if (set.size > 0 && topPct[h] > pct + 1e-9) break;
    set.add(h);
  }
  return set;
}
