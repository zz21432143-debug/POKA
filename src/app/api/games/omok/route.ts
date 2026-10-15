import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { cleanRoomTitle } from "@/lib/game-room";
import {
  NO_YOKAI,
  createOmok,
  gamesOpen,
  omokLobby,
  roomByCode,
} from "@/lib/omok-server";

export const dynamic = "force-dynamic";
const NO_STORE = { "Cache-Control": "no-store" };

/**
 * ?code=방코드 → { id }(누구나 · 코드를 받은 사람이 들어오게)
 * 그 밖: 로비(대기 중인 방 · 대국 중 · 내 최근 대국) — 비공개 기간엔 마스터만
 */
export async function GET(request: Request) {
  const code = new URL(request.url).searchParams.get("code");
  if (code !== null) {
    const room = await roomByCode(code);
    if (!room)
      return NextResponse.json(
        { error: "그런 방 코드가 없어요. 다시 확인해 주세요." },
        { status: 404, headers: NO_STORE },
      );
    return NextResponse.json(
      { id: room.id, status: room.status },
      { headers: NO_STORE },
    );
  }
  const user = await getCurrentUser().catch(() => null);
  if (!gamesOpen(user))
    return NextResponse.json({ error: "준비 중이에요." }, { status: 404 });
  return NextResponse.json(await omokLobby(user?.id ?? null), {
    headers: NO_STORE,
  });
}

/** 방 만들기 → { id }(요괴가 없으면 code: NO_YOKAI) */
export async function POST(request: Request) {
  const user = await getCurrentUser().catch(() => null);
  if (!user)
    return NextResponse.json({ error: "로그인해 주세요." }, { status: 401 });
  if (!gamesOpen(user))
    return NextResponse.json({ error: "준비 중이에요." }, { status: 404 });
  const body = (await request.json().catch(() => ({}))) as { private?: unknown; title?: unknown };
  const t = cleanRoomTitle(body.title);
  if ("error" in t) return NextResponse.json({ error: t.error }, { status: 400 });
  const made = await createOmok(user.id, { isPrivate: body.private === true, title: t.title });
  if ("error" in made)
    return NextResponse.json(
      { error: "함께할 요괴를 먼저 골라 주세요.", code: NO_YOKAI },
      { status: 403, headers: NO_STORE },
    );
  return NextResponse.json({ id: made.id }, { headers: NO_STORE });
}
