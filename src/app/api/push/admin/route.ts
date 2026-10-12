import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { pushEnabled } from "@/lib/push";

type Body = {
  subscription?: { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
  endpoint?: string;
};

/** 이 기기의 관리자 알림 상태 */
export async function GET(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;
  const endpoint = new URL(request.url).searchParams.get("endpoint")?.trim() ?? "";
  if (!endpoint) return NextResponse.json({ on: false });
  const row = await prisma.pushSubscription.findUnique({ where: { endpoint }, select: { adminAlerts: true } });
  return NextResponse.json({ on: Boolean(row?.adminAlerts) });
}

/** 관리자 알림 켜기(새 광고·홍보 문의). 급구 지역 알림 구독은 그대로 둡니다. */
export async function POST(request: Request) {
  const { user, error } = await requireAdmin();
  if (error) return error;
  if (!pushEnabled()) {
    return NextResponse.json({ error: "알림 기능이 아직 준비되지 않았습니다." }, { status: 503 });
  }
  const body = (await request.json().catch(() => ({}))) as Body;
  const endpoint = body.subscription?.endpoint?.trim();
  const p256dh = body.subscription?.keys?.p256dh?.trim();
  const auth = body.subscription?.keys?.auth?.trim();
  if (!endpoint || !p256dh || !auth || !endpoint.startsWith("https://")) {
    return NextResponse.json({ error: "구독 정보를 확인하세요." }, { status: 400 });
  }
  await prisma.pushSubscription.upsert({
    where: { endpoint },
    // 지역은 비워 둡니다(급구 알림은 받지 않음).
    create: { endpoint, p256dh, auth, region: "", userId: user.id, adminAlerts: true },
    update: { p256dh, auth, userId: user.id, adminAlerts: true },
  });
  return NextResponse.json({ ok: true });
}

/** 관리자 알림 끄기. 급구 알림도 안 받는 기기면 구독을 지우고 keep:false를 돌려줍니다. */
export async function DELETE(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;
  const body = (await request.json().catch(() => ({}))) as Body;
  const endpoint = body.endpoint?.trim();
  if (!endpoint) return NextResponse.json({ error: "endpoint가 필요합니다." }, { status: 400 });
  const row = await prisma.pushSubscription.findUnique({ where: { endpoint }, select: { region: true } });
  if (row?.region) {
    await prisma.pushSubscription.update({ where: { endpoint }, data: { adminAlerts: false } });
    return NextResponse.json({ ok: true, keep: true });
  }
  await prisma.pushSubscription.deleteMany({ where: { endpoint } });
  return NextResponse.json({ ok: true, keep: false });
}
