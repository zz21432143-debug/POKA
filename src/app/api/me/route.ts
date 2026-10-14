import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";

export const dynamic = "force-dynamic";

/** 로그인한 회원 닉네임(공유 이미지 「○○님이 공유」 등). 비로그인이면 null */
export async function GET() {
  const user = await getCurrentUser().catch(() => null);
  return NextResponse.json({ nickname: user?.nickname ?? null }, { headers: { "Cache-Control": "no-store" } });
}
