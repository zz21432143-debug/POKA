import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { canUseDealerTools } from "@/lib/dealer-tools-access";
import { RotationError, applyRotation, loadRotation, rotationVersion } from "@/lib/rotation-server";
import type { RotationAction } from "@/lib/rotation";

export const dynamic = "force-dynamic";

async function guard() {
  const user = await getCurrentUser().catch(() => null);
  if (!canUseDealerTools(user)) {
    return NextResponse.json({ error: "준비 중인 기능입니다." }, { status: 403 });
  }
  return null;
}

/** 상태 받기. ?g=게임, ?v=번호를 주면 바뀐 게 없을 때 짧게 답합니다(다른 기기 즉시 반영용 확인). */
export async function GET(request: Request) {
  const denied = await guard();
  if (denied) return denied;
  const params = new URL(request.url).searchParams;
  const game = params.get("g");
  const known = Number(params.get("v"));
  if (Number.isFinite(known) && known > 0 && known === (await rotationVersion(game))) {
    return NextResponse.json({ changed: false }, { headers: { "Cache-Control": "no-store" } });
  }
  return NextResponse.json({ changed: true, state: await loadRotation(game) }, { headers: { "Cache-Control": "no-store" } });
}

/** 변경: { action } → 바뀐 상태 */
export async function POST(request: Request) {
  const denied = await guard();
  if (denied) return denied;
  const body = (await request.json().catch(() => ({}))) as { game?: string; action?: RotationAction };
  if (!body.action || typeof body.action !== "object") {
    return NextResponse.json({ error: "요청을 확인하세요." }, { status: 400 });
  }
  let game: string;
  try {
    game = await applyRotation(typeof body.game === "string" ? body.game : null, body.action);
  } catch (error) {
    if (error instanceof RotationError) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ error: "저장하지 못했습니다. 다시 시도해 주세요." }, { status: 500 });
  }
  return NextResponse.json({ ok: true, state: await loadRotation(game) });
}
