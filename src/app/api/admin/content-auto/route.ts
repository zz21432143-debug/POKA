import { NextResponse } from "next/server";
import { requireMaster } from "@/lib/admin";
import { setAutoPublish } from "@/lib/content-auto";

/** 콘텐츠 자동 발행 켜기 · 끄기 { on } (마스터 전용) */
export async function POST(request: Request) {
  const { error } = await requireMaster();
  if (error) return error;
  const body = (await request.json().catch(() => ({}))) as { on?: unknown };
  if (typeof body.on !== "boolean") return NextResponse.json({ error: "on이 필요합니다." }, { status: 400 });
  await setAutoPublish(body.on);
  return NextResponse.json({ ok: true, on: body.on });
}
