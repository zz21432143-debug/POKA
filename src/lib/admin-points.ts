import { prisma } from "@/lib/db";
import { isLockedRewardSlug } from "@/lib/yokai-catalog";

/** 운영자 포인트 지급 · 회수 한 번에 움직일 수 있는 최대 */
export const ADMIN_POINT_LIMIT = 100_000;

export type AdminPointLog = {
  id: string;
  at: string;
  kind: "admin-points" | "admin-mark-refund";
  targetNickname: string | null;
  by: string;
  amount: number;
  reason: string;
  mark?: string;
};

/** 마크 환불 기본 금액: 산 기록(mark-buy)이 있으면 그 값, 없으면 상점 가격 · 보상 마크는 0 */
export async function refundAmountFor(userId: string, mark: { id: string; slug: string; pricePoints: number }) {
  const log = await prisma.auditLog
    .findFirst({ where: { kind: "mark-buy", userId, detail: { startsWith: `${mark.id}:` } }, orderBy: { createdAt: "desc" }, select: { detail: true } })
    .catch(() => null);
  const paid = Number(log?.detail?.split(":")[1]);
  if (Number.isFinite(paid) && paid >= 0) return { amount: paid, known: true };
  if (isLockedRewardSlug(mark.slug) || mark.pricePoints <= 0) return { amount: 0, known: true };
  return { amount: mark.pricePoints, known: false };
}

/** 최근 운영자 포인트 · 환불 기록 */
export async function recentAdminPointLogs(limit = 30, userId?: string): Promise<AdminPointLog[]> {
  const rows = await prisma.auditLog
    .findMany({ where: { kind: { in: ["admin-points", "admin-mark-refund"] }, ...(userId ? { userId } : {}) }, orderBy: { createdAt: "desc" }, take: limit })
    .catch(() => []);
  const ids = [...new Set(rows.map((r) => r.userId).filter((v): v is string => Boolean(v)))];
  const users = ids.length ? await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, nickname: true } }).catch(() => []) : [];
  const name = new Map(users.map((u) => [u.id, u.nickname]));
  return rows.map((r) => {
    let d: { by?: string; amount?: number; reason?: string; mark?: string } = {};
    try {
      d = JSON.parse(r.detail ?? "{}");
    } catch {
      /* 예전 형식 */
    }
    return {
      id: r.id,
      at: r.createdAt.toISOString(),
      kind: r.kind as AdminPointLog["kind"],
      targetNickname: r.userId ? (name.get(r.userId) ?? null) : null,
      by: d.by ?? "-",
      amount: Number(d.amount) || 0,
      reason: d.reason ?? "",
      mark: d.mark,
    };
  });
}
