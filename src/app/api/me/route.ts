import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";

export const dynamic = "force-dynamic";

/** 로그인한 회원 닉네임(공유 이미지 「○○님이 공유」 등) · 초대 코드(공유 이미지 QR에 붙음). 비로그인이면 null */
export async function GET() {
  const user = await getCurrentUser().catch(() => null);
  const inviteCode = user ? await import("@/lib/invite").then((m) => m.myInviteCode(user.id)).catch(() => null) : null;
  return NextResponse.json({ nickname: user?.nickname ?? null, inviteCode }, { headers: { "Cache-Control": "no-store" } });
}
