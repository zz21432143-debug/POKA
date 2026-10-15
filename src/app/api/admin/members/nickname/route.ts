import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { clientIp } from "@/lib/request";
import { forceNicknameChange, isForceReason } from "@/lib/nickname-force";

export const dynamic = "force-dynamic";

/** 닉네임 강제 변경(마스터만): { nickname, reason } → 바른닉네임1234 · 변경권 1장 · 알림 */
export async function POST(request: Request) {
  const viewer = await getCurrentUser().catch(() => null);
  if (!viewer?.isMaster)
    return NextResponse.json(
      { error: "마스터만 할 수 있어요." },
      { status: 403 },
    );
  const body = (await request.json().catch(() => ({}))) as {
    nickname?: unknown;
    reason?: unknown;
  };
  if (typeof body.nickname !== "string" || !isForceReason(body.reason))
    return NextResponse.json(
      { error: "닉네임과 사유를 골라 주세요." },
      { status: 400 },
    );
  const result = await forceNicknameChange(
    body.nickname,
    body.reason,
    viewer.id,
    clientIp(request),
  );
  if (!result.ok)
    return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json(result);
}
