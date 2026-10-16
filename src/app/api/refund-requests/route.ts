import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";
import { clientIp } from "@/lib/request";
import { REFUND_REQUEST_DAYS, REFUND_REQUEST_MAX, REFUND_REQUEST_MONTHLY, listRefundRequests, refundableItems } from "@/lib/refund-requests";

export const dynamic = "force-dynamic";

/** 회원 환불 요청: { kind: "mark" | "cosmetic", itemId, reason } — 운영자가 승인하면 환불 */
export async function POST(request: Request) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "로그인해 주세요." }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as { kind?: string; itemId?: string; reason?: string };
  const reason = (body.reason ?? "").trim().slice(0, 200);
  if (reason.length < 2) return NextResponse.json({ error: "환불 사유를 적어 주세요." }, { status: 400 });
  const items = await refundableItems(user.id);
  const item = items.find((i) => i.kind === body.kind && i.itemId === body.itemId);
  if (!item) return NextResponse.json({ error: `산 지 ${REFUND_REQUEST_DAYS}일 안 된 상품만 요청할 수 있어요.` }, { status: 400 });
  const pending = await listRefundRequests({ userId: user.id, pendingOnly: true });
  if (pending.some((p) => p.kind === item.kind && p.itemId === item.itemId)) return NextResponse.json({ error: "이미 요청한 상품이에요. 운영자 확인을 기다려 주세요." }, { status: 409 });
  const monthly = await prisma.auditLog.count({ where: { kind: "refund-request", userId: user.id, createdAt: { gte: new Date(Date.now() - 30 * 86_400_000) } } });
  if (monthly >= REFUND_REQUEST_MONTHLY) return NextResponse.json({ error: `환불 요청은 30일에 ${REFUND_REQUEST_MONTHLY}번까지 할 수 있어요.` }, { status: 429 });
  if (pending.length >= REFUND_REQUEST_MAX) return NextResponse.json({ error: `확인 중인 요청이 ${REFUND_REQUEST_MAX}개라 더 걸 수 없어요.` }, { status: 429 });
  await prisma.auditLog.create({
    data: { kind: "refund-request", userId: user.id, ip: clientIp(request), detail: JSON.stringify({ kind: item.kind, itemId: item.itemId, name: item.name, reason, status: "pending" }) },
  });
  const { notifyAdmins } = await import("@/lib/push");
  await notifyAdmins({ title: "🔁 환불 요청", body: `${user.nickname} · [${item.name}] ${reason}`, url: "/admin/points" }).catch(() => undefined);
  return NextResponse.json({ ok: true });
}
