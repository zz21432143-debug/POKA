import { prisma } from "@/lib/db";
import { ttlCache } from "@/lib/ttl-cache";
import { profileYokai } from "@/lib/yokai-server";
import type { YokaiSpecies } from "@/lib/yokai";

/** 관전자 한 명(관전석 미니 아바타): 닉네임 · 대표 요괴 */
export type Watcher = { n: string; s: YokaiSpecies | null; st: number };

const WATCH_MS = 15_000;

/** 대표 요괴 얼굴(닉네임 기준 · 1분 캐시 — 관전자 줄은 1초마다 다시 그리므로) */
async function faceOf(nickname: string) {
  return ttlCache(`watch-face:${nickname}`, 60_000, async () => {
    const u = await prisma.user.findFirst({ where: { nickname }, select: { id: true } }).catch(() => null);
    const yk = u ? await profileYokai(u.id).catch(() => null) : null;
    return yk ? { s: yk.species, st: yk.stage } : null;
  });
}

/** 지금 보고 있는 관전자(최근 15초 신호) — 대국자 자리 신호(p:회원id)는 뺌 */
export async function watchersWithFaces(gameId: string) {
  const rows = await prisma.gameWatch
    .findMany({
      where: { gameId, seenAt: { gte: new Date(Date.now() - WATCH_MS) }, NOT: { viewer: { startsWith: "p:" } } },
      select: { nickname: true },
      take: 60,
    })
    .catch(() => []);
  const names = [...new Set(rows.map((r) => r.nickname).filter((n): n is string => Boolean(n)))];
  const list: Watcher[] = await Promise.all(
    names.slice(0, 16).map(async (n) => {
      const f = await faceOf(n).catch(() => null);
      return { n, s: f?.s ?? null, st: f?.st ?? 1 };
    }),
  );
  return { count: rows.length, names, list };
}

/** 이 방에 누가 있는지(대국자 · 관전자 신호 아무거나) — 0명이면 방을 닫음 */
/** 지금(30초 안) 그 게임(오목 · 윷) 방에 있는 사람 수(대국자 + 관전자) */
export async function playersOnline(game: "omok" | "yut") {
  const since = new Date(Date.now() - 30_000);
  const rows =
    game === "omok"
      ? await prisma.$queryRaw<{ n: number }[]>`SELECT COUNT(DISTINCT w.viewer)::int AS n FROM "GameWatch" w JOIN "OmokGame" g ON g.id = w."gameId" WHERE w."seenAt" >= ${since}`.catch(() => [{ n: 0 }])
      : await prisma.$queryRaw<{ n: number }[]>`SELECT COUNT(DISTINCT w.viewer)::int AS n FROM "GameWatch" w JOIN "YutGame" g ON g.id = w."gameId" WHERE w."seenAt" >= ${since}`.catch(() => [{ n: 0 }]);
  return rows[0]?.n ?? 0;
}

export async function anyoneHere(gameId: string, withinMs: number) {
  const n = await prisma.gameWatch.count({ where: { gameId, seenAt: { gte: new Date(Date.now() - withinMs) } } }).catch(() => 1);
  return n > 0;
}
