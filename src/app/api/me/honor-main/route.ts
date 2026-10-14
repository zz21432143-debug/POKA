import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { HONOR_KEYS } from "@/lib/pot-title-config";
import { setHonorMain } from "@/lib/pot-titles";

export const dynamic = "force-dynamic";

/** 대표 칭호 고르기: { key: 랭킹 칭호 키 | "pot" | "" } (빈 값이면 기본 순서) */
export async function POST(request: Request) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "로그인해 주세요." }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as { key?: unknown };
  const key = typeof body.key === "string" ? body.key : "";
  if (key && key !== "pot" && !(HONOR_KEYS as readonly string[]).includes(key)) {
    return NextResponse.json({ error: "칭호를 확인하세요." }, { status: 400 });
  }
  await setHonorMain(user.id, key);
  return NextResponse.json({ ok: true });
}
