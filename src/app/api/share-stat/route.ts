import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { SHARE_TOOLS } from "@/lib/share-stats";

export const dynamic = "force-dynamic";

/** 이미지 공유 한 번 기록: { tool, format, result } (모르는 값은 버림) */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { tool?: string; format?: string; result?: string };
  const tool = String(body.tool ?? "");
  const format = body.format === "story" ? "story" : "square";
  const result = body.result === "shared" ? "shared" : body.result === "downloaded" ? "downloaded" : null;
  if (!(tool in SHARE_TOOLS) || !result) return NextResponse.json({ ok: false }, { status: 400 });
  await prisma.toolSaved
    .create({ data: { ownerId: "site", kind: "share-event", name: `${tool}|${format}|${result}`, dataJson: "{}" } })
    .catch(() => undefined);
  return NextResponse.json({ ok: true });
}
