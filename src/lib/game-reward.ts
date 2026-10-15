import { prisma } from "@/lib/db";
import { WIN_REWARD } from "@/lib/game-config";
import { ttlCache, ttlCacheClear } from "@/lib/ttl-cache";

export type WinReward = { points: number; exp: number; affection: number; perDay: number; perOpponentPerDay: number };
const KEY = "game-win-reward";

const clamp = (v: unknown, lo: number, hi: number, d: number) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : d;
};

/** 관리자 값 다듬기(이상한 값은 기본값으로) */
export function normalizeWinReward(raw: unknown): WinReward {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return {
    points: clamp(r.points, 0, 1000, WIN_REWARD.points),
    exp: clamp(r.exp, 0, 1000, WIN_REWARD.exp),
    affection: clamp(r.affection, 0, 50, WIN_REWARD.affection),
    perDay: clamp(r.perDay, 0, 50, WIN_REWARD.perDay),
    perOpponentPerDay: clamp(r.perOpponentPerDay, 0, 50, WIN_REWARD.perOpponentPerDay),
  };
}

/** 게임 승리 보상(관리자가 바꾼 값 · 없으면 기본) — 1분 캐시 */
export async function loadWinReward(): Promise<WinReward> {
  return ttlCache(KEY, 60_000, async () => {
    const row = await prisma.siteSetting.findUnique({ where: { id: "default" }, select: { gameRewardJson: true } }).catch(() => null);
    if (!row?.gameRewardJson) return { ...WIN_REWARD };
    try {
      return normalizeWinReward(JSON.parse(row.gameRewardJson));
    } catch {
      return { ...WIN_REWARD };
    }
  });
}

export async function saveWinReward(raw: unknown) {
  const v = normalizeWinReward(raw);
  await prisma.siteSetting.upsert({ where: { id: "default" }, create: { id: "default", gameRewardJson: JSON.stringify(v) }, update: { gameRewardJson: JSON.stringify(v) } });
  ttlCacheClear(KEY);
  return v;
}
