import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { isPushEndpoint, pushEnabled } from "@/lib/push";

export const dynamic = "force-dynamic";

type Body = { subscription?: { endpoint?: string; keys?: { p256dh?: string; auth?: string } } };

/** 이 기기가 매일 알림(퀴즈 · 출석 · 요괴) 중 하나라도 받는지 */
export async function GET(request: Request) {
  const endpoint = new URL(request.url).searchParams.get("endpoint")?.trim() ?? "";
  if (!endpoint) return NextResponse.json({ on: false });
  const row = await prisma.pushSubscription
    .findUnique({ where: { endpoint }, select: { quizAlerts: true, attendAlerts: true, yokaiAlerts: true } })
    .catch(() => null);
  return NextResponse.json({ on: Boolean(row && (row.quizAlerts || row.attendAlerts || row.yokaiAlerts)) });
}

/** 매일 알림 한 번에 켜기(회원만): 퀴즈(아침 · 저녁) · 출석 1등(밤 12시) · 요괴 배고픔(저녁 7시). 다른 알림은 그대로 */
export async function POST(request: Request) {
  if (!pushEnabled()) return NextResponse.json({ error: "알림 기능이 아직 준비되지 않았습니다." }, { status: 503 });
  const user = await getCurrentUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "로그인하면 켤 수 있어요." }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as Body;
  const endpoint = body.subscription?.endpoint?.trim();
  const p256dh = body.subscription?.keys?.p256dh?.trim();
  const auth = body.subscription?.keys?.auth?.trim();
  if (!endpoint || !p256dh || !auth || !isPushEndpoint(endpoint) || endpoint.length > 1000 || p256dh.length > 200 || auth.length > 100) {
    return NextResponse.json({ error: "구독 정보를 확인하세요." }, { status: 400 });
  }
  const on = { quizAlerts: true, attendAlerts: true, yokaiAlerts: true };
  await prisma.pushSubscription.upsert({
    where: { endpoint },
    create: { endpoint, p256dh, auth, region: "", userId: user.id, ...on },
    update: { p256dh, auth, userId: user.id, ...on },
  });
  return NextResponse.json({ ok: true });
}
