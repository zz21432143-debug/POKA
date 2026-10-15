import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { SHARE_TOOLS } from "@/lib/share-stats";
import { getCurrentUser } from "@/lib/current-user";
import { todayKstDate } from "@/lib/dates";
import { clientIp } from "@/lib/request";
import { CoolDownError, assertAttemptLimit, writeAudit } from "@/lib/security";

export const dynamic = "force-dynamic";

/** 이미지 공유 한 번 기록: { tool, format, result } (모르는 값은 버림) */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { tool?: string; format?: string; result?: string };
  const tool = String(body.tool ?? "");
  const format = body.format === "story" ? "story" : "square";
  const result = body.result === "shared" ? "shared" : body.result === "downloaded" ? "downloaded" : null;
  if (!(tool in SHARE_TOOLS) || !result) return NextResponse.json({ ok: false }, { status: 400 });
  // 직접 마구 불러서 기록을 부풀리지 못하게: 한 IP에서 1시간에 30번까지
  const ip = clientIp(request);
  try {
    await assertAttemptLimit({ kind: "share-stat", ip, max: 30, windowMs: 60 * 60 * 1000, message: "잠시 뒤에 다시 시도해 주세요." });
  } catch (error) {
    if (error instanceof CoolDownError) return NextResponse.json({ ok: false }, { status: 429 });
    throw error;
  }
  await writeAudit({ kind: "share-stat", ip }).catch(() => undefined);
  await prisma.toolSaved
    .create({ data: { ownerId: "site", kind: "share-event", name: `${tool}|${format}|${result}`, dataJson: "{}" } })
    .catch(() => undefined);
  // 로그인 회원: 공유한 날을 하루 한 줄만(요괴 마을 「화룡」 조건 = 공유한 날 수)
  const user = await getCurrentUser().catch(() => null);
  if (user) {
    const day = todayKstDate();
    await prisma.toolSaved
      .createMany({ data: [{ id: `share_${user.id}_${day}`, ownerId: user.id, kind: "share-user", name: day, dataJson: "{}" }], skipDuplicates: true })
      .catch(() => undefined);
  }
  return NextResponse.json({ ok: true });
}
