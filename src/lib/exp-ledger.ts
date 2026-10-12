import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/db";

let ready: Promise<void> | null = null;

/** 경험치 획득 기록(주간·월간 경험치 랭킹과 주간 보상용). 포인트 기록(PointLedger)과 같은 방식입니다. */
export function ensureExpLedger() {
  ready ??= prisma
    .$executeRawUnsafe(
      `CREATE TABLE IF NOT EXISTS "ExpLedger" (
        id TEXT PRIMARY KEY,
        "userId" TEXT NOT NULL,
        delta INTEGER NOT NULL,
        reason TEXT NOT NULL DEFAULT '',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,
    )
    .then(() =>
      prisma.$executeRawUnsafe(
        `CREATE INDEX IF NOT EXISTS "ExpLedger_userId_createdAt_idx" ON "ExpLedger" ("userId", "createdAt")`,
      ),
    )
    .then(() => undefined)
    .catch((error) => {
      ready = null;
      throw error;
    });
  return ready;
}

export async function recordExpGain(userId: string, delta: number, reason: string) {
  if (delta <= 0) return;
  await ensureExpLedger();
  await prisma.$executeRaw`
    INSERT INTO "ExpLedger" (id, "userId", delta, reason, "createdAt")
    VALUES (${`xl_${randomUUID()}`}, ${userId}, ${delta}, ${reason}, NOW())
  `;
}
