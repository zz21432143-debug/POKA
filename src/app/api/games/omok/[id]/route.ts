import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { omokAct, omokState, type OmokAction } from "@/lib/omok-server";

export const dynamic = "force-dynamic";
const NO_STORE = { "Cache-Control": "no-store" };
const ACTIONS: OmokAction[] = [
  "join",
  "move",
  "resign",
  "cancel",
  "emote",
  "rematch",
];

/** 대국 상태(누구나 관전) · ?v=버전이 같으면 { same: true }만 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const v = new URL(request.url).searchParams.get("v");
  const user = await getCurrentUser().catch(() => null);
  const state = await omokState(
    id,
    user?.id ?? null,
    v !== null && /^\d+$/.test(v) ? Number(v) : undefined,
  );
  if (!state)
    return NextResponse.json(
      { error: "대국을 찾을 수 없어요." },
      { status: 404 },
    );
  return NextResponse.json(state, { headers: NO_STORE });
}

/** 참가 · 두기 · 기권 · 방 닫기 · 이모티콘 · 한 판 더 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await getCurrentUser().catch(() => null);
  if (!user)
    return NextResponse.json(
      { error: "로그인해야 대국할 수 있어요." },
      { status: 401 },
    );
  const body = (await request.json().catch(() => ({}))) as {
    action?: unknown;
    p?: unknown;
    e?: unknown;
  };
  const action = ACTIONS.find((a) => a === body.action);
  if (!action)
    return NextResponse.json({ error: "잘못된 요청이에요." }, { status: 400 });
  const result = await omokAct(id, user.id, action, body);
  if (!result.ok)
    return NextResponse.json(
      { error: result.error },
      { status: result.status, headers: NO_STORE },
    );
  return NextResponse.json({ view: result.view }, { headers: NO_STORE });
}
