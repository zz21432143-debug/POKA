import { NextResponse } from "next/server";
import { loadSharedBoard } from "@/lib/game-board-server";

export const dynamic = "force-dynamic";

/** 보기 전용 현황판(TV 링크). ?v=번호를 주면 바뀐 게 없을 때 짧게 답합니다. */
export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const shared = await loadSharedBoard(token).catch(() => null);
  if (!shared) return NextResponse.json({ error: "공유가 꺼졌거나 잘못된 링크입니다." }, { status: 404 });
  const known = Number(new URL(request.url).searchParams.get("v"));
  if (Number.isFinite(known) && known === shared.version) return NextResponse.json({ changed: false, serverNow: shared.serverNow }, { headers: { "Cache-Control": "no-store" } });
  return NextResponse.json({ changed: true, board: shared }, { headers: { "Cache-Control": "no-store" } });
}
