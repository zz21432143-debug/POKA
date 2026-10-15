import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { createOmok, gamesOpen, omokLobby } from "@/lib/omok-server";

export const dynamic = "force-dynamic";
const NO_STORE = { "Cache-Control": "no-store" };

/** 로비: 대국 중(관전) · 내 최근 대국 — 비공개 기간엔 마스터만 */
export async function GET() {
  const user = await getCurrentUser().catch(() => null);
  if (!gamesOpen(user))
    return NextResponse.json({ error: "준비 중이에요." }, { status: 404 });
  return NextResponse.json(await omokLobby(user?.id ?? null), {
    headers: NO_STORE,
  });
}

/** 친구 대전 방 만들기 → { id } */
export async function POST() {
  const user = await getCurrentUser().catch(() => null);
  if (!user)
    return NextResponse.json({ error: "로그인해 주세요." }, { status: 401 });
  if (!gamesOpen(user))
    return NextResponse.json({ error: "준비 중이에요." }, { status: 404 });
  return NextResponse.json(
    { id: await createOmok(user.id) },
    { headers: NO_STORE },
  );
}
