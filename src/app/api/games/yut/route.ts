import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { NO_YOKAI, createYut, gamesOpenYut, isYutMode, yutLobby, yutRoomByCode } from "@/lib/yut-server";

export const dynamic = "force-dynamic";
const NO_STORE = { "Cache-Control": "no-store" };

/** ?code=초대코드 → { id } · 그 밖: 로비(기다리는 방 · 진행 중 · 최근 5판) */
export async function GET(request: Request) {
  const code = new URL(request.url).searchParams.get("code");
  if (code !== null) {
    const room = await yutRoomByCode(code);
    if (!room) return NextResponse.json({ error: "그런 초대 코드가 없어요. 다시 확인해 주세요." }, { status: 404, headers: NO_STORE });
    return NextResponse.json({ id: room.id, status: room.status }, { headers: NO_STORE });
  }
  const user = await getCurrentUser().catch(() => null);
  if (!gamesOpenYut(user)) return NextResponse.json({ error: "준비 중이에요." }, { status: 404 });
  return NextResponse.json(await yutLobby(), { headers: NO_STORE });
}

/** 방 만들기 { mode: 1~4, private } → { id } */
export async function POST(request: Request) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "로그인해 주세요." }, { status: 401 });
  if (!gamesOpenYut(user)) return NextResponse.json({ error: "준비 중이에요." }, { status: 404 });
  const body = (await request.json().catch(() => ({}))) as { mode?: unknown; private?: unknown };
  const mode = Number(body.mode ?? 1);
  if (!isYutMode(mode)) return NextResponse.json({ error: "1:1 ~ 4:4 중에서 골라 주세요." }, { status: 400 });
  const made = await createYut(user.id, mode, body.private === true);
  if ("error" in made) return NextResponse.json({ error: "함께할 요괴를 먼저 골라 주세요.", code: NO_YOKAI }, { status: 403, headers: NO_STORE });
  return NextResponse.json({ id: made.id }, { headers: NO_STORE });
}
