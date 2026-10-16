import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { NO_YOKAI, createOmok, gamesOpen, omokAct } from "@/lib/omok-server";

export const dynamic = "force-dynamic";

/**
 * 빠른 대전: 기다리는 공개방에 바로 앉고(최근 것부터), 없으면 내 방을 만들어 그 방으로.
 */
export async function GET(request: Request) {
  const base = new URL(request.url);
  const go = (path: string) => NextResponse.redirect(new URL(path, base));
  const user = await getCurrentUser().catch(() => null);
  if (!user) return go("/login?next=/games/omok/quick");
  if (!gamesOpen(user)) return go("/games");
  const rooms = await prisma.omokGame
    .findMany({
      where: { status: "waiting", isPrivate: false, guestId: null, hostId: { not: user.id }, updatedAt: { gte: new Date(Date.now() - 30 * 60_000) } },
      orderBy: { updatedAt: "desc" },
      take: 5,
      select: { id: true },
    })
    .catch(() => []);
  for (const room of rooms) {
    // 앉기(방장이 떠난 방은 정리되며 실패 → 다음 방)
    const r = await omokAct(room.id, user.id, "sit", {}).catch(() => null);
    if (r?.ok && (r.view.seat === "guest" || r.view.seat === "host")) return go(`/games/omok/${room.id}`);
    if (r && !r.ok && r.status === 403 && r.error === NO_YOKAI) return go("/yokai?next=/games/omok");
  }
  const made = await createOmok(user.id, { isPrivate: false }).catch(() => ({ error: "방을 만들지 못했어요." }));
  if ("error" in made) return go(made.error === NO_YOKAI ? "/yokai?next=/games/omok" : "/games/omok");
  return go(`/games/omok/${made.id}`);
}
