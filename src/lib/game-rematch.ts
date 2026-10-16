import { prisma } from "@/lib/db";

/**
 * 「한 판 더」 신청 · 수락 · 거절(오목 · 윷 1:1 공통).
 * 한 사람이 신청하면 상대 화면에 「수락 · 거절」이 뜨고, 상대가 수락해야 새 대기실이 열림.
 */
type Ask = { by: string; n: string; declined?: boolean };
export type RematchView = { name: string; mine: boolean; declined: boolean } | null;

const keyOf = (game: "omok" | "yut", gameId: string) => `rematch_${game}_${gameId}`;

export async function readRematch(game: "omok" | "yut", gameId: string): Promise<Ask | null> {
  const row = await prisma.toolSaved.findUnique({ where: { id: keyOf(game, gameId) }, select: { dataJson: true } }).catch(() => null);
  if (!row) return null;
  try {
    const v = JSON.parse(row.dataJson) as Ask;
    return typeof v.by === "string" ? v : null;
  } catch {
    return null;
  }
}

export async function askRematch(game: "omok" | "yut", gameId: string, userId: string) {
  const me = await prisma.user.findUnique({ where: { id: userId }, select: { nickname: true } }).catch(() => null);
  const dataJson = JSON.stringify({ by: userId, n: me?.nickname ?? "상대" } satisfies Ask);
  await prisma.toolSaved.upsert({
    where: { id: keyOf(game, gameId) },
    create: { id: keyOf(game, gameId), ownerId: userId, kind: "rematch", name: gameId, dataJson },
    update: { ownerId: userId, dataJson },
  });
}

/** 상대 신청을 거절(내 신청은 거절할 수 없음) */
export async function declineRematch(game: "omok" | "yut", gameId: string, userId: string) {
  const ask = await readRematch(game, gameId);
  if (!ask || ask.by === userId || ask.declined) return false;
  await prisma.toolSaved.update({ where: { id: keyOf(game, gameId) }, data: { dataJson: JSON.stringify({ ...ask, declined: true }) } }).catch(() => undefined);
  return true;
}

export function rematchView(ask: Ask | null, viewerId: string | null): RematchView {
  if (!ask) return null;
  return { name: ask.n, mine: ask.by === viewerId, declined: Boolean(ask.declined) };
}
