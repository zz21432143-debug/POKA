import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { isPushEndpoint, pushEnabled } from "@/lib/push";

export const dynamic = "force-dynamic";

type Body = {
  subscription?: {
    endpoint?: string;
    keys?: { p256dh?: string; auth?: string };
  };
  endpoint?: string;
};

/** 이 기기의 오락실 상대 찾기 알림 상태 */
export async function GET(request: Request) {
  const endpoint =
    new URL(request.url).searchParams.get("endpoint")?.trim() ?? "";
  if (!endpoint) return NextResponse.json({ on: false });
  const row = await prisma.pushSubscription
    .findUnique({ where: { endpoint }, select: { gameAlerts: true } })
    .catch(() => null);
  return NextResponse.json({ on: Boolean(row?.gameAlerts) });
}

/** 오락실 상대 찾기 알림 켜기(하루 2번까지). 다른 알림은 그대로 둡니다. */
export async function POST(request: Request) {
  if (!pushEnabled())
    return NextResponse.json(
      { error: "알림 기능이 아직 준비되지 않았습니다." },
      { status: 503 },
    );
  const body = (await request.json().catch(() => ({}))) as Body;
  const endpoint = body.subscription?.endpoint?.trim();
  const p256dh = body.subscription?.keys?.p256dh?.trim();
  const auth = body.subscription?.keys?.auth?.trim();
  if (
    !endpoint ||
    !p256dh ||
    !auth ||
    !isPushEndpoint(endpoint) ||
    endpoint.length > 1000 ||
    p256dh.length > 200 ||
    auth.length > 100
  ) {
    return NextResponse.json(
      { error: "구독 정보를 확인하세요." },
      { status: 400 },
    );
  }
  const user = await getCurrentUser().catch(() => null);
  await prisma.pushSubscription.upsert({
    where: { endpoint },
    // 지역은 비워 둡니다(급구 알림은 따로 켬)
    create: {
      endpoint,
      p256dh,
      auth,
      region: "",
      userId: user?.id ?? null,
      gameAlerts: true,
    },
    update: {
      p256dh,
      auth,
      gameAlerts: true,
      ...(user ? { userId: user.id } : {}),
    },
  });
  return NextResponse.json({ ok: true });
}

/** 오락실 상대 찾기 알림 끄기. 다른 알림도 안 받는 기기면 구독을 지웁니다(keep:false → 브라우저 구독도 해제). */
export async function DELETE(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Body;
  const endpoint = body.endpoint?.trim();
  if (!endpoint)
    return NextResponse.json(
      { error: "endpoint가 필요합니다." },
      { status: 400 },
    );
  const row = await prisma.pushSubscription.findUnique({
    where: { endpoint },
    select: {
      region: true,
      adminAlerts: true,
      yokaiAlerts: true,
      quizAlerts: true,
      attendAlerts: true,
    },
  });
  if (
    row &&
    !row.region &&
    !row.adminAlerts &&
    !row.yokaiAlerts &&
    !row.quizAlerts &&
    !row.attendAlerts
  ) {
    await prisma.pushSubscription.deleteMany({ where: { endpoint } });
    return NextResponse.json({ ok: true, keep: false });
  }
  await prisma.pushSubscription.updateMany({
    where: { endpoint },
    data: { gameAlerts: false },
  });
  return NextResponse.json({ ok: true, keep: true });
}
