import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { parseAlertRegion } from "@/lib/job-status";
import { isPushEndpoint, pushEnabled } from "@/lib/push";
import { clientIp } from "@/lib/request";
import { CoolDownError, assertAttemptLimit, writeAudit } from "@/lib/security";

type Body = {
  region?: string;
  subscription?: { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
  endpoint?: string;
};

/** 급구 알림 구독(지역 변경 포함). 로그인 없이도 받을 수 있습니다. */
export async function POST(request: Request) {
  if (!pushEnabled()) {
    return NextResponse.json({ error: "알림 기능이 아직 준비되지 않았습니다." }, { status: 503 });
  }
  const body = (await request.json().catch(() => ({}))) as Body;
  const region = parseAlertRegion(body.region);
  const endpoint = body.subscription?.endpoint?.trim();
  const p256dh = body.subscription?.keys?.p256dh?.trim();
  const auth = body.subscription?.keys?.auth?.trim();
  if (!region || !endpoint || !p256dh || !auth || !isPushEndpoint(endpoint) || endpoint.length > 1000 || p256dh.length > 200 || auth.length > 100) {
    return NextResponse.json({ error: "구독 정보를 확인하세요." }, { status: 400 });
  }
  // 한 IP에서 1시간에 30번까지(지역 바꾸기 포함)
  const ip = clientIp(request);
  try {
    await assertAttemptLimit({ kind: "push-sub", ip, max: 30, windowMs: 60 * 60 * 1000, message: "잠시 뒤에 다시 시도해 주세요." });
  } catch (error) {
    if (error instanceof CoolDownError) return NextResponse.json({ error: error.message }, { status: 429 });
    throw error;
  }
  await writeAudit({ kind: "push-sub", ip }).catch(() => undefined);
  const user = await getCurrentUser().catch(() => null);
  await prisma.pushSubscription.upsert({
    where: { endpoint },
    create: { endpoint, p256dh, auth, region, userId: user?.id ?? null },
    update: { p256dh, auth, region, userId: user?.id ?? null },
  });
  return NextResponse.json({ ok: true, region });
}

/** 구독 해제. 관리자 알림을 켜 둔 기기는 급구 지역만 비우고 keep:true를 돌려줍니다. */
export async function DELETE(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Body;
  const endpoint = body.endpoint?.trim();
  if (!endpoint) return NextResponse.json({ error: "endpoint가 필요합니다." }, { status: 400 });
  const row = await prisma.pushSubscription.findUnique({ where: { endpoint }, select: { adminAlerts: true } });
  if (row?.adminAlerts) {
    await prisma.pushSubscription.update({ where: { endpoint }, data: { region: "" } });
    return NextResponse.json({ ok: true, keep: true });
  }
  await prisma.pushSubscription.deleteMany({ where: { endpoint } });
  return NextResponse.json({ ok: true, keep: false });
}
