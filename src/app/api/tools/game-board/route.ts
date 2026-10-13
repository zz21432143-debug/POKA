import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { canUseDealerTools } from "@/lib/dealer-tools-access";
import type { ClockOp } from "@/lib/game-board";
import { BUILD_ID } from "@/lib/build-id";
import { GameBoardError, boardVersion, createBoard, deleteBoard, listBoards, loadBoard, setBoardShare, updateBoard } from "@/lib/game-board-server";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

async function guard(): Promise<{ ownerId: string } | { denied: NextResponse }> {
  const user = await getCurrentUser().catch(() => null);
  if (!user || !canUseDealerTools(user)) return { denied: NextResponse.json({ error: "로그인하면 쓸 수 있습니다." }, { status: 403 }) };
  return { ownerId: user.id };
}

/** 목록, 또는 ?id=현황판(&v=번호를 주면 바뀐 게 없을 때 짧게) */
export async function GET(request: Request) {
  const access = await guard();
  if ("denied" in access) return access.denied;
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ boards: await listBoards(access.ownerId) }, { headers: NO_STORE });
  const known = Number(url.searchParams.get("v"));
  if (Number.isFinite(known) && known >= 0 && known === (await boardVersion(access.ownerId, id))) {
    return NextResponse.json({ changed: false, serverNow: Date.now(), build: BUILD_ID }, { headers: NO_STORE });
  }
  const board = await loadBoard(access.ownerId, id);
  if (!board) return NextResponse.json({ error: "현황판을 찾을 수 없습니다." }, { status: 404 });
  return NextResponse.json({ changed: true, board, build: BUILD_ID }, { headers: NO_STORE });
}

const CLOCK_OPS = new Set(["start", "pause", "next", "prev", "reset", "add", "jump"]);

/** { action: "create" | "save" | "clock" | "share" | "delete", ... } */
export async function POST(request: Request) {
  const access = await guard();
  if ("denied" in access) return access.denied;
  const body = (await request.json().catch(() => ({}))) as { action?: string; id?: string; name?: string; data?: unknown; clock?: { op?: string; ms?: number; index?: number }; on?: boolean };
  const id = typeof body.id === "string" ? body.id : "";
  try {
    if (body.action === "create") {
      const newId = await createBoard(access.ownerId, typeof body.name === "string" ? body.name.slice(0, 30) : undefined);
      return NextResponse.json({ ok: true, id: newId, boards: await listBoards(access.ownerId), board: await loadBoard(access.ownerId, newId) });
    }
    if (body.action === "delete") {
      await deleteBoard(access.ownerId, id);
      return NextResponse.json({ ok: true, boards: await listBoards(access.ownerId) });
    }
    if (body.action === "save") await updateBoard(access.ownerId, id, { data: body.data });
    else if (body.action === "clock") {
      if (!body.clock || !CLOCK_OPS.has(String(body.clock.op))) return NextResponse.json({ error: "잘못된 조작입니다." }, { status: 400 });
      await updateBoard(access.ownerId, id, { clock: { op: body.clock.op, ms: Number(body.clock.ms) || 0, index: Number(body.clock.index) || 0 } as ClockOp });
    } else if (body.action === "share") await setBoardShare(access.ownerId, id, Boolean(body.on));
    else return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
    return NextResponse.json({ ok: true, board: await loadBoard(access.ownerId, id) });
  } catch (error) {
    if (error instanceof GameBoardError) return NextResponse.json({ error: error.message }, { status: 400 });
    throw error;
  }
}
