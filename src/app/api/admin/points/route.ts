import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { clientIp } from "@/lib/request";
import { ADMIN_POINT_LIMIT, refundAmountFor } from "@/lib/admin-points";

export const dynamic = "force-dynamic";

/**
 * 운영자(마스터) 포인트 관리
 * - { action: "grant", userId, amount(+지급 / -회수), reason }
 * - { action: "refund", userId, markId, amount?, reason } — 마크를 회수하고 포인트를 돌려줌(착용 중이면 벗김)
 * 모든 처리는 AuditLog에 남습니다.
 */
export async function POST(request: Request) {
  const { user, error } = await requireAdmin();
  if (error) return error;
  if (!user.isMaster) return NextResponse.json({ error: "마스터 계정만 포인트를 지급 · 환불할 수 있어요." }, { status: 403 });
  const body = (await request.json().catch(() => ({}))) as { action?: string; userId?: string; markId?: string; amount?: unknown; reason?: string };
  const reason = (body.reason ?? "").trim().slice(0, 200);
  if (!body.userId) return NextResponse.json({ error: "회원을 골라 주세요." }, { status: 400 });
  if (reason.length < 2) return NextResponse.json({ error: "사유를 적어 주세요(기록에 남아요)." }, { status: 400 });
  const target = await prisma.user.findUnique({ where: { id: body.userId }, select: { id: true, nickname: true, points: true, equippedMarkId: true } });
  if (!target) return NextResponse.json({ error: "없는 회원입니다." }, { status: 404 });
  const ip = clientIp(request);

  if (body.action === "grant") {
    const amount = Math.trunc(Number(body.amount));
    if (!Number.isFinite(amount) || amount === 0) return NextResponse.json({ error: "포인트를 적어 주세요(회수는 -로)." }, { status: 400 });
    if (Math.abs(amount) > ADMIN_POINT_LIMIT) return NextResponse.json({ error: `한 번에 ${ADMIN_POINT_LIMIT.toLocaleString()}P까지만 움직일 수 있어요.` }, { status: 400 });
    const done = await prisma.$transaction(async (tx) => {
      // 회수는 가진 포인트까지만(마이너스가 되지 않게)
      const r = await tx.user.updateMany({
        where: { id: target.id, ...(amount < 0 ? { points: { gte: -amount } } : {}) },
        data: { points: { increment: amount } },
      });
      if (r.count !== 1) return null;
      await tx.auditLog.create({ data: { kind: "admin-points", userId: target.id, ip, detail: JSON.stringify({ by: user.nickname, amount, reason }) } });
      return tx.user.findUnique({ where: { id: target.id }, select: { points: true } });
    });
    if (!done) return NextResponse.json({ error: `회수할 포인트가 모자라요(지금 ${target.points.toLocaleString()}P).` }, { status: 400 });
    await notify(target.id, amount > 0 ? `🎁 운영자가 ${amount.toLocaleString()}P를 지급했어요` : `운영자가 ${(-amount).toLocaleString()}P를 회수했어요`, reason);
    return NextResponse.json({ ok: true, points: done.points });
  }

  if (body.action === "refund") {
    if (!body.markId) return NextResponse.json({ error: "환불할 마크를 골라 주세요." }, { status: 400 });
    const owned = await prisma.userMark.findUnique({ where: { userId_markId: { userId: target.id, markId: body.markId } }, include: { mark: true } });
    if (!owned) return NextResponse.json({ error: "이 회원이 가진 마크가 아니에요." }, { status: 404 });
    const base = await refundAmountFor(target.id, owned.mark);
    const amount = body.amount === undefined || body.amount === "" ? base.amount : Math.trunc(Number(body.amount));
    if (!Number.isFinite(amount) || amount < 0 || amount > ADMIN_POINT_LIMIT) return NextResponse.json({ error: "환불 포인트를 확인해 주세요." }, { status: 400 });
    const done = await prisma.$transaction(async (tx) => {
      const del = await tx.userMark.deleteMany({ where: { userId: target.id, markId: owned.markId } });
      if (del.count !== 1) return null;
      return tx.user.update({
        where: { id: target.id },
        data: {
          points: { increment: amount },
          // 착용 중이던 마크면 벗김
          ...(target.equippedMarkId === owned.markId ? { equippedMarkId: null, profileMarkImageUrl: null } : {}),
        },
        select: { points: true },
      }).then(async (u) => {
        await tx.auditLog.create({ data: { kind: "admin-mark-refund", userId: target.id, ip, detail: JSON.stringify({ by: user.nickname, amount, reason, mark: owned.mark.name }) } });
        return u;
      });
    });
    if (!done) return NextResponse.json({ error: "이미 환불된 마크예요." }, { status: 409 });
    await notify(target.id, `[${owned.mark.name}] 마크가 환불됐어요 · ${amount.toLocaleString()}P`, reason);
    return NextResponse.json({ ok: true, points: done.points, refunded: amount });
  }

  return NextResponse.json({ error: "알 수 없는 요청입니다." }, { status: 400 });
}

async function notify(userId: string, title: string, body: string) {
  const { notifyUser } = await import("@/lib/push");
  await notifyUser(userId, { title, body: `사유: ${body}`, url: "/me" }).catch(() => undefined);
}
