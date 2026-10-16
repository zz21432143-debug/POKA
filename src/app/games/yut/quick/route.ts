import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { NO_YOKAI, createYut, gamesOpenYut, yutAct } from "@/lib/yut-server";

export const dynamic = "force-dynamic";

/**
 * 빠른 대전: 빈자리가 있는 공개 대기실에 바로 앉고(최근 것부터), 없으면 1:1 방을 만들어 그 방으로.
 */
export async function GET(request: Request) {
  const base = new URL(request.url);
  const go = (path: string) => NextResponse.redirect(new URL(path, base));
  const user = await getCurrentUser().catch(() => null);
  if (!user) return go("/login?next=/games/yut/quick");
  if (!gamesOpenYut(user)) return go("/games");
  const rooms = await prisma.yutGame
    .findMany({
      where: { status: "waiting", isPrivate: false, hostId: { not: user.id }, updatedAt: { gte: new Date(Date.now() - 30 * 60_000) } },
      orderBy: { updatedAt: "desc" },
      take: 8,
      select: { id: true, seatsJson: true },
    })
    .catch(() => []);
  for (const room of rooms) {
    let seats: { team: "A" | "B"; idx: number; userId?: string | null; bot?: boolean }[] = [];
    try {
      seats = JSON.parse(room.seatsJson);
    } catch {
      continue;
    }
    if (seats.some((x) => x.userId === user.id)) return go(`/games/yut/${room.id}`);
    // 사람이 적은 팀의 빈자리부터
    const empty = seats.filter((x) => !x.userId && !x.bot).sort((a, b) => (a.team === "B" ? -1 : 1) - (b.team === "B" ? -1 : 1));
    for (const seat of empty) {
      const r = await yutAct(room.id, user.id, "sit", { team: seat.team, idx: seat.idx }).catch(() => null);
      if (r?.ok) return go(`/games/yut/${room.id}`);
      if (r && !r.ok && r.status === 403 && r.error === NO_YOKAI) return go("/yokai?next=/games/yut");
      if (r && !r.ok) break;
    }
  }
  const made = await createYut(user.id, 1, false).catch(() => ({ error: "방을 만들지 못했어요." }));
  if ("error" in made) return go(made.error === NO_YOKAI ? "/yokai?next=/games/yut" : "/games/yut");
  return go(`/games/yut/${made.id}`);
}
