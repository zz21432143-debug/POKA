import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { parseJobRegion } from "@/lib/job-status";
import { pushEnabled } from "@/lib/push";

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
  const region = parseJobRegion(body.region);
  const endpoint = body.subscription?.endpoint?.trim();
  const p256dh = body.subscription?.keys?.p256dh?.trim();
  const auth = body.subscription?.keys?.auth?.trim();
  if (!region || !endpoint || !p256dh || !auth || !endpoint.startsWith("https://")) {
    return NextResponse.json({ error: "구독 정보를 확인하세요." }, { status: 400 });
  }
  const user = await getCurrentUser().catch(() => null);
  await prisma.pushSubscription.upsert({
    where: { endpoint },
    create: { endpoint, p256dh, auth, region, userId: user?.id ?? null },
    update: { p256dh, auth, region, userId: user?.id ?? null },
  });
  return NextResponse.json({ ok: true, region });
}

/** 구독 해제 */
export async function DELETE(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Body;
  const endpoint = body.endpoint?.trim();
  if (!endpoint) return NextResponse.json({ error: "endpoint가 필요합니다." }, { status: 400 });
  await prisma.pushSubscription.deleteMany({ where: { endpoint } });
  return NextResponse.json({ ok: true });
}
