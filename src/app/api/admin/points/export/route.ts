import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { ADMIN_LOG_KINDS } from "@/lib/admin-points";

export const dynamic = "force-dynamic";

const KIND: Record<string, string> = { "admin-points": "지급·회수", "admin-mark-refund": "마크 환불", "admin-cosmetic-refund": "프레임·이펙트 환불" };
const cell = (v: unknown) => {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** 운영자 포인트 기록 엑셀(CSV) — ?month=2026-10 (없으면 최근 90일) */
export async function GET(request: Request) {
  const { user, error } = await requireAdmin();
  if (error) return error;
  if (!user.isMaster) return new Response("마스터만 받을 수 있어요.", { status: 403 });
  const month = new URL(request.url).searchParams.get("month") ?? "";
  const m = /^(\d{4})-(\d{2})$/.exec(month);
  // 한국 시간 기준 그 달 1일 0시 ~ 다음 달 1일 0시
  const from = m ? new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, 1) - 9 * 3600_000) : new Date(Date.now() - 90 * 86_400_000);
  const to = m ? new Date(Date.UTC(Number(m[1]), Number(m[2]), 1) - 9 * 3600_000) : new Date(Date.now() + 60_000);
  const rows = await prisma.auditLog.findMany({ where: { kind: { in: ADMIN_LOG_KINDS }, createdAt: { gte: from, lt: to } }, orderBy: { createdAt: "asc" }, take: 20_000 });
  const ids = [...new Set(rows.map((r) => r.userId).filter((v): v is string => Boolean(v)))];
  const users = ids.length ? await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, nickname: true } }) : [];
  const name = new Map(users.map((u) => [u.id, u.nickname]));
  const fmt = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
  const lines = [["날짜", "종류", "회원", "포인트", "상품", "사유", "처리한 사람"].join(",")];
  let sum = 0;
  for (const r of rows) {
    let d: { by?: string; amount?: number; reason?: string; mark?: string } = {};
    try {
      d = JSON.parse(r.detail ?? "{}");
    } catch {
      /* 예전 형식 */
    }
    const amount = Number(d.amount) || 0;
    sum += amount;
    lines.push([fmt.format(r.createdAt), KIND[r.kind] ?? r.kind, r.userId ? (name.get(r.userId) ?? "(탈퇴)") : "", amount, d.mark ?? "", d.reason ?? "", d.by ?? ""].map(cell).join(","));
  }
  lines.push(["합계", "", `${rows.length}건`, sum, "", "", ""].map(cell).join(","));
  // 엑셀에서 한글이 깨지지 않게 BOM
  return new Response("﻿" + lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="poka-points-${m ? month : "90days"}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
