import { prisma } from "@/lib/db";

export const POST_COOLDOWN_MS = 60_000;
export const COMMENT_COOLDOWN_MS = 20_000;
export const REPORT_COOLDOWN_MS = 30_000;
export const REGISTER_COOLDOWN_MS = 45_000;
export const REPORT_HIDE_THRESHOLD = 3;

export class CoolDownError extends Error {
  retryAfterSec: number;
  constructor(retryAfterSec: number, message: string) {
    super(message);
    this.name = "CoolDownError";
    this.retryAfterSec = retryAfterSec;
  }
}

async function hit(key: string, windowMs: number, label: string) {
  const now = Date.now();
  const row = await prisma.writeThrottle.findUnique({ where: { key } });
  if (row) {
    const elapsed = now - row.lastAt.getTime();
    if (elapsed < windowMs) {
      const retryAfterSec = Math.ceil((windowMs - elapsed) / 1000);
      throw new CoolDownError(
        retryAfterSec,
        `${label}은 ${retryAfterSec}초 후에 다시 할 수 있습니다.`,
      );
    }
  }
  await prisma.writeThrottle.upsert({
    where: { key },
    create: { key, lastAt: new Date(now) },
    update: { lastAt: new Date(now) },
  });
}

export async function assertWriteCooldown(options: {
  kind: "post" | "comment" | "report" | "register";
  userId?: string;
  ip: string;
  isAdmin?: boolean;
}) {
  if (options.isAdmin) return;
  const windowMs =
    options.kind === "post"
      ? POST_COOLDOWN_MS
      : options.kind === "report"
        ? REPORT_COOLDOWN_MS
        : options.kind === "register"
          ? REGISTER_COOLDOWN_MS
          : COMMENT_COOLDOWN_MS;
  const label =
    options.kind === "post"
      ? "글 작성"
      : options.kind === "report"
        ? "신고"
        : options.kind === "register"
          ? "가입"
          : "댓글 작성";
  if (options.userId) {
    await hit(`${options.kind}:user:${options.userId}`, windowMs, label);
  }
  await hit(`${options.kind}:ip:${options.ip}`, windowMs, label);
}

export async function writeAudit(entry: {
  kind: string;
  userId?: string | null;
  ip: string;
  postId?: string | null;
  detail?: string;
}) {
  await prisma.auditLog.create({
    data: {
      kind: entry.kind,
      userId: entry.userId ?? null,
      ip: entry.ip,
      postId: entry.postId ?? null,
      detail: entry.detail ?? null,
    },
  });
}
