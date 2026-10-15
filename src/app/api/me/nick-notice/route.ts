import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { ackNickNotice } from "@/lib/nickname-force";

export const dynamic = "force-dynamic";

/** 닉네임 강제 변경 안내 「확인」 */
export async function POST() {
  const user = await getCurrentUser().catch(() => null);
  if (!user)
    return NextResponse.json({ error: "로그인해 주세요." }, { status: 401 });
  await ackNickNotice(user.id);
  return NextResponse.json({ ok: true });
}
