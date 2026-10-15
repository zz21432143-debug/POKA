import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { NO_YOKAI, yutAct, yutState, type YutAction } from "@/lib/yut-server";

export const dynamic = "force-dynamic";
const NO_STORE = { "Cache-Control": "no-store" };
const ACTIONS: YutAction[] = ["sit", "leave", "ready", "shuffle", "mode", "kick", "start", "throw", "move", "emote", "cheer", "exit", "rematch"];

/** 판 상태(누구나 관전) · ?v=버전이 같으면 { same: true }만 · &w=키(보고 있어요) */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const query = new URL(request.url).searchParams;
  const v = query.get("v");
  const user = await getCurrentUser().catch(() => null);
  const state = await yutState(id, user?.id ?? null, v !== null && /^\d+$/.test(v) ? Number(v) : undefined, query.get("w") ?? undefined);
  if (!state) return NextResponse.json({ error: "방을 찾을 수 없어요." }, { status: 404 });
  return NextResponse.json(state, { headers: NO_STORE });
}

/** 자리 · READY · 팀 섞기 · 인원 · 내보내기 · 시작 · 던지기 · 말 옮기기 · 이모티콘 · 나가기 · 한 판 더 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "로그인해야 놀 수 있어요." }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const action = ACTIONS.find((a) => a === body.action);
  if (!action) return NextResponse.json({ error: "잘못된 요청이에요." }, { status: 400 });
  const result = await yutAct(id, user.id, action, body);
  if (!result.ok) {
    if (result.error === NO_YOKAI) return NextResponse.json({ error: "함께할 요괴를 먼저 골라 주세요.", code: NO_YOKAI }, { status: 403, headers: NO_STORE });
    return NextResponse.json({ error: result.error }, { status: result.status, headers: NO_STORE });
  }
  return NextResponse.json({ view: result.view }, { headers: NO_STORE });
}
