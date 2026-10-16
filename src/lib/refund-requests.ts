import { prisma } from "@/lib/db";

/** 회원 환불 요청: 산 지 이만큼 안 된 마크 · 프레임 · 이펙트만 */
export const REFUND_REQUEST_DAYS = 7;
/** 한 사람이 동시에 걸어 둘 수 있는 요청 수 */
export const REFUND_REQUEST_MAX = 3;
/** 30일 동안 걸 수 있는 요청 수(자주 사고 무르는 것 막기) */
export const REFUND_REQUEST_MONTHLY = 3;

export type RefundRequest = {
  id: string;
  at: string;
  userId: string;
  nickname: string | null;
  kind: "mark" | "cosmetic";
  itemId: string;
  name: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  note?: string;
};

export function parseRequest(row: { id: string; createdAt: Date; userId: string | null; detail: string | null }, nickname: string | null = null): RefundRequest | null {
  try {
    const d = JSON.parse(row.detail ?? "{}") as Partial<RefundRequest>;
    if (!row.userId || (d.kind !== "mark" && d.kind !== "cosmetic") || !d.itemId) return null;
    return {
      id: row.id,
      at: row.createdAt.toISOString(),
      userId: row.userId,
      nickname,
      kind: d.kind,
      itemId: d.itemId,
      name: d.name ?? "",
      reason: d.reason ?? "",
      status: d.status === "approved" || d.status === "rejected" ? d.status : "pending",
      note: d.note,
    };
  } catch {
    return null;
  }
}

/** 요청 목록(운영자: 전체 · 회원: 내 것) */
export async function listRefundRequests(opts: { userId?: string; pendingOnly?: boolean; limit?: number } = {}) {
  const rows = await prisma.auditLog
    .findMany({ where: { kind: "refund-request", ...(opts.userId ? { userId: opts.userId } : {}) }, orderBy: { createdAt: "desc" }, take: opts.limit ?? 50 })
    .catch(() => []);
  const ids = [...new Set(rows.map((r) => r.userId).filter((v): v is string => Boolean(v)))];
  const users = ids.length ? await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, nickname: true } }).catch(() => []) : [];
  const name = new Map(users.map((u) => [u.id, u.nickname]));
  return rows
    .map((r) => parseRequest(r, r.userId ? (name.get(r.userId) ?? null) : null))
    .filter((r): r is RefundRequest => Boolean(r) && (!opts.pendingOnly || r!.status === "pending"));
}

/** 회원이 요청할 수 있는 것: 최근 7일 안에 산 마크 · 프레임 · 이펙트 */
export async function refundableItems(userId: string) {
  const since = new Date(Date.now() - REFUND_REQUEST_DAYS * 86_400_000);
  const [marks, cosmetics] = await Promise.all([
    prisma.userMark.findMany({ where: { userId, purchasedAt: { gte: since }, mark: { pricePoints: { gt: 0 } } }, include: { mark: { select: { name: true } } } }).catch(() => []),
    prisma.userCosmetic.findMany({ where: { userId, purchasedAt: { gte: since } }, include: { cosmetic: { select: { name: true } } } }).catch(() => []),
  ]);
  return [
    ...marks.map((m) => ({ kind: "mark" as const, itemId: m.markId, name: m.mark.name, at: m.purchasedAt.toISOString() })),
    ...cosmetics.map((c) => ({ kind: "cosmetic" as const, itemId: c.cosmeticId, name: c.cosmetic.name, at: c.purchasedAt.toISOString() })),
  ];
}
