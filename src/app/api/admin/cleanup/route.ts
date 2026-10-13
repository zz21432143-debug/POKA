import { NextResponse } from "next/server";
import { requireMaster } from "@/lib/admin";
import { purgeSeekingPosts, purgeUnusedImages } from "@/lib/data-cleanup";

/** 데이터 정리(마스터 전용): { action: "seeking" | "images" } */
export async function POST(request: Request) {
  const { error } = await requireMaster();
  if (error) return error;
  const body = (await request.json().catch(() => ({}))) as { action?: string };
  if (body.action === "seeking") {
    return NextResponse.json({ ok: true, deleted: await purgeSeekingPosts() });
  }
  if (body.action === "images") {
    const result = await purgeUnusedImages();
    return NextResponse.json({ ok: true, deleted: result.count, bytes: result.bytes });
  }
  return NextResponse.json({ error: "알 수 없는 요청입니다." }, { status: 400 });
}
