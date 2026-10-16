import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { clientIp } from "@/lib/request";
import { ADMIN_POINT_LIMIT, cosmeticRefundFor, refundAmountFor } from "@/lib/admin-points";

export const dynamic = "force-dynamic";

/**
 * 운영자(마스터) 포인트 관리
 * - { action: "grant", userId, amount(+지급 / -회수), reason }
 * - { action: "refund", userId, markId, amount?, reason } — 마크를 회수하고 포인트를 돌려줌(착용 중이면 벗김)
 * - { action: "refund-cosmetic", userId, cosmeticId, amount?, reason } — 프레임 · 이펙트 환불
 * - { action: "bulk", nicknames: "a, b\nc", amount(+), reason } — 여러 명에게 한꺼번에 지급(최대 100명)
 * 모든 처리는 AuditLog에 남습니다.
 */
export async function POST(request: Request) {
  const { user, error } = await requireAdmin();
  if (error) return error;
  if (!user.isMaster) return NextResponse.json({ error: "마스터 계정만 포인트를 지급 · 환불할 수 있어요." }, { status: 403 });
  const body = (await request.json().catch(() => ({}))) as { action?: string; userId?: string; markId?: string; amount?: unknown; reason?: string };
  const reason = (body.reason ?? "").trim().slice(0, 200);
  if (body.action === "bulk") return bulkGrant(body as { nicknames?: string; amount?: unknown }, reason, user.nickname, clientIp(request));
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

  if (body.action === "refund-cosmetic") {
    const cosmeticId = (body as { cosmeticId?: string }).cosmeticId;
    if (!cosmeticId) return NextResponse.json({ error: "환불할 상품을 골라 주세요." }, { status: 400 });
    const owned = await prisma.userCosmetic.findUnique({ where: { userId_cosmeticId: { userId: target.id, cosmeticId } }, include: { cosmetic: true } });
    if (!owned) return NextResponse.json({ error: "이 회원이 가진 상품이 아니에요." }, { status: 404 });
    const base = await cosmeticRefundFor(target.id, owned.cosmetic);
    const amount = body.amount === undefined || body.amount === "" ? base.amount : Math.trunc(Number(body.amount));
    if (!Number.isFinite(amount) || amount < 0 || amount > ADMIN_POINT_LIMIT) return NextResponse.json({ error: "환불 포인트를 확인해 주세요." }, { status: 400 });
    const eq = await prisma.user.findUnique({ where: { id: target.id }, select: { equippedFrameId: true, equippedEffectId: true } });
    const done = await prisma.$transaction(async (tx) => {
      const del = await tx.userCosmetic.deleteMany({ where: { userId: target.id, cosmeticId } });
      if (del.count !== 1) return null;
      const u = await tx.user.update({
        where: { id: target.id },
        data: {
          points: { increment: amount },
          ...(eq?.equippedFrameId === cosmeticId ? { equippedFrameId: null } : {}),
          ...(eq?.equippedEffectId === cosmeticId ? { equippedEffectId: null } : {}),
        },
        select: { points: true },
      });
      await tx.auditLog.create({ data: { kind: "admin-cosmetic-refund", userId: target.id, ip, detail: JSON.stringify({ by: user.nickname, amount, reason, mark: owned.cosmetic.name }) } });
      return u;
    });
    if (!done) return NextResponse.json({ error: "이미 환불된 상품이에요." }, { status: 409 });
    await notify(target.id, `[${owned.cosmetic.name}] 상품이 환불됐어요 · ${amount.toLocaleString()}P`, reason);
    return NextResponse.json({ ok: true, points: done.points, refunded: amount });
  }

  return NextResponse.json({ error: "알 수 없는 요청입니다." }, { status: 400 });
}

/** 여러 명에게 같은 포인트 지급(이벤트 당첨 등) — 없는 닉네임은 알려 줌 */
async function bulkGrant(body: { nicknames?: string; amount?: unknown }, reason: string, by: string, ip: string) {
  const amount = Math.trunc(Number(body.amount));
  if (!Number.isFinite(amount) || amount <= 0 || amount > ADMIN_POINT_LIMIT) return NextResponse.json({ error: `지급 포인트는 1~${ADMIN_POINT_LIMIT.toLocaleString()}P예요.` }, { status: 400 });
  if (reason.length < 2) return NextResponse.json({ error: "사유를 적어 주세요(기록에 남아요)." }, { status: 400 });
  const names = [...new Set((body.nicknames ?? "").split(/[\n,]+/).map((s) => s.trim().replace(/^@/, "")).filter(Boolean))];
  if (!names.length) return NextResponse.json({ error: "닉네임을 넣어 주세요(줄바꿈 · 쉼표로 구분)." }, { status: 400 });
  if (names.length > 100) return NextResponse.json({ error: "한 번에 100명까지예요." }, { status: 400 });
  const users = await prisma.user.findMany({ where: { nickname: { in: names }, withdrawnAt: null }, select: { id: true, nickname: true } });
  if (users.length) {
    await prisma.$transaction([
      prisma.user.updateMany({ where: { id: { in: users.map((u) => u.id) } }, data: { points: { increment: amount } } }),
      prisma.auditLog.createMany({ data: users.map((u) => ({ kind: "admin-points", userId: u.id, ip, detail: JSON.stringify({ by, amount, reason }) })) }),
    ]);
    await Promise.all(users.map((u) => notify(u.id, `🎁 운영자가 ${amount.toLocaleString()}P를 지급했어요`, reason)));
  }
  const got = new Set(users.map((u) => u.nickname));
  return NextResponse.json({ ok: true, granted: users.map((u) => u.nickname), missing: names.filter((n) => !got.has(n)) });
}

async function notify(userId: string, title: string, body: string) {
  const { notifyUser } = await import("@/lib/push");
  await notifyUser(userId, { title, body: `사유: ${body}`, url: "/me" }).catch(() => undefined);
}
