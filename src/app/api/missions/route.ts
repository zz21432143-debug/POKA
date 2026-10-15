import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { claimMissions, getMissions } from "@/lib/missions";

export const dynamic = "force-dynamic";
const NO_STORE = { "Cache-Control": "no-store" };

export async function GET() {
  const user = await getCurrentUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  return NextResponse.json({ missions: await getMissions(user.id) }, { headers: NO_STORE });
}

/** 오늘의 미션 보너스 받기 */
export async function POST() {
  const user = await getCurrentUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  const result = await claimMissions(user.id);
  const missions = await getMissions(user.id);
  if (!result.ok) return NextResponse.json({ error: result.error, missions }, { status: 409, headers: NO_STORE });
  return NextResponse.json({ ok: true, missions }, { headers: NO_STORE });
}
