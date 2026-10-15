import { prisma } from "@/lib/db";

/**
 * 서버 오류 기록 · 관리자 알림.
 * 같은 오류(화면 + 첫 줄)는 10분에 한 번만 기록하고, 알림은 30분에 한 번만(폭주 방지).
 * 개인 정보가 섞이지 않게 주소의 물음표 뒤(검색어 등)는 빼고, 메시지는 300자까지만.
 */
const KIND = "server-error";
const RECORD_GAP = 10 * 60_000;
const PUSH_GAP = 30 * 60_000;
const recent = new Map<string, number>();
let lastPush = 0;

export async function recordServerError(error: unknown, path: string, method: string) {
  try {
    const message = (error instanceof Error ? error.message : String(error)).split("\n")[0].slice(0, 300);
    const cleanPath = (path || "?").split("?")[0].slice(0, 200);
    const key = `${method} ${cleanPath} ${message}`;
    const now = Date.now();
    if (now - (recent.get(key) ?? 0) < RECORD_GAP) return;
    recent.set(key, now);
    if (recent.size > 500) recent.clear();
    const digest = error && typeof error === "object" && "digest" in error ? String((error as { digest?: unknown }).digest ?? "") : "";
    await prisma.toolSaved.create({
      data: { ownerId: "site", kind: KIND, name: cleanPath, dataJson: JSON.stringify({ method, message, digest }) },
    });
    if (now - lastPush > PUSH_GAP) {
      lastPush = now;
      const { notifyAdmins } = await import("@/lib/push");
      await notifyAdmins({ title: "⚠️ POKA 서버 오류", body: `${cleanPath} · ${message.slice(0, 80)}`, url: "/admin/errors" }).catch(() => undefined);
    }
  } catch {
    /* 기록이 실패해도 사이트는 그대로 */
  }
}

export type ErrorRow = { id: string; path: string; method: string; message: string; digest: string; at: string };

/** 최근 오류(관리자 화면) · 30일 지난 기록은 정리 */
export async function listServerErrors(take = 100): Promise<ErrorRow[]> {
  await prisma.toolSaved.deleteMany({ where: { kind: KIND, createdAt: { lt: new Date(Date.now() - 30 * 86_400_000) } } }).catch(() => undefined);
  const rows = await prisma.toolSaved.findMany({ where: { kind: KIND }, orderBy: { createdAt: "desc" }, take }).catch(() => []);
  return rows.map((r) => {
    let d: { method?: string; message?: string; digest?: string } = {};
    try {
      d = JSON.parse(r.dataJson);
    } catch {
      /* 빈 칸 */
    }
    return { id: r.id, path: r.name, method: d.method ?? "", message: d.message ?? "", digest: d.digest ?? "", at: r.createdAt.toISOString() };
  });
}
