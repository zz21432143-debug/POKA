import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/db";

let ready: Promise<void> | null = null;

export function ensurePointLedger() {
  ready ??= prisma
    .$executeRawUnsafe(
      `CREATE TABLE IF NOT EXISTS "PointLedger" (
        id TEXT PRIMARY KEY,
        "userId" TEXT NOT NULL,
        delta INTEGER NOT NULL,
        reason TEXT NOT NULL DEFAULT '',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,
    )
    .then(() =>
      prisma.$executeRawUnsafe(
        `CREATE INDEX IF NOT EXISTS "PointLedger_userId_createdAt_idx" ON "PointLedger" ("userId", "createdAt")`,
      ),
    )
    .then(() => undefined)
    .catch((error) => {
      ready = null;
      throw error;
    });
  return ready;
}

export async function recordPointGain(userId: string, delta: number, reason: string) {
  if (delta <= 0) return;
  await ensurePointLedger();
  await prisma.$executeRaw`
    INSERT INTO "PointLedger" (id, "userId", delta, reason, "createdAt")
    VALUES (${`pl_${randomUUID()}`}, ${userId}, ${delta}, ${reason}, NOW())
  `;
}
