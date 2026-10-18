import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { canUseDealerTools } from "@/lib/dealer-tools-access";
import { RotationConflict, RotationError, applyRotation, loadRotation, rotationVersion } from "@/lib/rotation-server";
import type { RotationAction } from "@/lib/rotation";

export const dynamic = "force-dynamic";

/** 쓸 수 있는 계정이면 그 계정 id, 아니면 403 응답 */
async function guard(): Promise<{ ownerId: string } | { denied: NextResponse }> {
  const user = await getCurrentUser().catch(() => null);
  if (!user || !canUseDealerTools(user)) {
    return { denied: NextResponse.json({ error: "준비 중인 기능입니다." }, { status: 403 }) };
  }
  return { ownerId: user.id };
}

/** 상태 받기. ?g=게임, ?v=번호를 주면 바뀐 게 없을 때 짧게 답합니다(다른 기기 즉시 반영용 확인). */
export async function GET(request: Request) {
  const access = await guard();
  if ("denied" in access) return access.denied;
  const params = new URL(request.url).searchParams;
  const game = params.get("g");
  const known = Number(params.get("v"));
  if (Number.isFinite(known) && known > 0 && known === (await rotationVersion(access.ownerId, game))) {
    return NextResponse.json({ changed: false }, { headers: { "Cache-Control": "no-store" } });
  }
  return NextResponse.json({ changed: true, state: await loadRotation(access.ownerId, game) }, { headers: { "Cache-Control": "no-store" } });
}

/** 변경: { action } → 바뀐 상태 */
export async function POST(request: Request) {
  const access = await guard();
  if ("denied" in access) return access.denied;
  const body = (await request.json().catch(() => ({}))) as { game?: string; action?: RotationAction };
  if (!body.action || typeof body.action !== "object") {
    return NextResponse.json({ error: "요청을 확인하세요." }, { status: 400 });
  }
  let game: string;
  try {
    game = await applyRotation(access.ownerId, typeof body.game === "string" ? body.game : null, body.action);
  } catch (error) {
    // 덮어쓰기 막음: 최신 상태를 같이 보내 화면이 바로 새 내용으로 바뀌게
    if (error instanceof RotationConflict) {
      return NextResponse.json({ error: error.message, conflict: true, state: await loadRotation(access.ownerId, typeof body.game === "string" ? body.game : null) }, { status: 409 });
    }
    if (error instanceof RotationError) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ error: "저장하지 못했습니다. 다시 시도해 주세요." }, { status: 500 });
  }
  return NextResponse.json({ ok: true, state: await loadRotation(access.ownerId, game) });
}
