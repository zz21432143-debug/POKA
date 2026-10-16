import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";
import { saveWinReward } from "@/lib/game-reward";

export const dynamic = "force-dynamic";

const parse = <T,>(json: string | null | undefined, d: T): T => {
  try {
    return json ? (JSON.parse(json) as T) : d;
  } catch {
    return d;
  }
};

/**
 * 오락실 관리(마스터):
 * - { action: "close", game: "omok" | "yut", id } → 방 강제 닫기(전적 · 보상 없이)
 * - { action: "kick", game, id, userId } → 대기실에서 내보내기(다시 못 앉음)
 * - { action: "reward", reward: { points, exp, affection, perDay, perOpponentPerDay } } → 승리 보상 조정
 */
export async function POST(request: Request) {
  const viewer = await getCurrentUser().catch(() => null);
  if (!viewer?.isMaster) return NextResponse.json({ error: "마스터만 할 수 있어요." }, { status: 403 });
  const body = (await request.json().catch(() => ({}))) as { action?: unknown; game?: unknown; id?: unknown; userId?: unknown; reward?: unknown };
  if (body.action === "reward") return NextResponse.json({ reward: await saveWinReward(body.reward) });
  const id = typeof body.id === "string" ? body.id : "";
  if (!id) return NextResponse.json({ error: "방을 골라 주세요." }, { status: 400 });
  if (body.action === "close") {
    const data = { status: "done", endReason: "cancel", version: { increment: 1 } };
    const r =
      body.game === "yut"
        ? await prisma.yutGame.updateMany({ where: { id, status: { in: ["waiting", "playing"] } }, data })
        : await prisma.omokGame.updateMany({ where: { id, status: { in: ["waiting", "playing"] } }, data });
    return NextResponse.json({ ok: r.count === 1 });
  }
  if (body.action === "kick") {
    const userId = typeof body.userId === "string" ? body.userId : "";
    if (body.game === "yut") {
      const row = await prisma.yutGame.findUnique({ where: { id } });
      if (!row || row.status !== "waiting") return NextResponse.json({ error: "대기실에서만 내보낼 수 있어요." }, { status: 409 });
      const seats = parse<{ userId: string | null; ready: boolean }[]>(row.seatsJson, []).map((x) => (x.userId === userId ? { ...x, userId: null, ready: false } : x));
      const kicked = [...new Set([...parse<string[]>(row.kickedJson, []), userId])].slice(-30);
      await prisma.yutGame.update({ where: { id }, data: { seatsJson: JSON.stringify(seats), kickedJson: JSON.stringify(kicked), version: { increment: 1 } } });
      return NextResponse.json({ ok: true });
    }
    const row = await prisma.omokGame.findUnique({ where: { id } });
    if (!row || row.status !== "waiting" || row.guestId !== userId) return NextResponse.json({ error: "대기실 손님만 내보낼 수 있어요(방장은 「방 닫기」)." }, { status: 409 });
    const kicked = [...new Set([...parse<string[]>(row.kickedJson, []), userId])].slice(-30);
    await prisma.omokGame.update({ where: { id }, data: { guestId: null, guestReady: false, hostReady: false, kickedJson: JSON.stringify(kicked), version: { increment: 1 } } });
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "알 수 없는 요청이에요." }, { status: 400 });
}
