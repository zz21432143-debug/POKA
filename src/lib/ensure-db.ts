import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import dns from "node:dns";
import { Client } from "pg";
import {
  hashPassword,
  MASTER_ACCOUNT_NICKNAME,
  MASTER_ACCOUNT_PASSWORD,
  SEED_ACCOUNT_PASSWORD,
} from "@/lib/password";

dns.setDefaultResultOrder("ipv4first");

let boot: Promise<void> | null = null;

function migrationPath() {
  const candidates = [
    join(process.cwd(), "prisma/migrations/20261007120000_init_postgres/migration.sql"),
    join(process.cwd(), "migrations/20261007120000_init_postgres/migration.sql"),
  ];
  return candidates.find((path) => existsSync(path));
}

function dbUrl() {
  const url = (process.env.DATABASE_URL || "").trim();
  if (!url.startsWith("postgres")) return "";
  if (/sslmode=/i.test(url) || url.includes("localhost")) return url;
  return `${url}${url.includes("?") ? "&" : "?"}sslmode=require`;
}

async function applySchema() {
  const url = dbUrl();
  if (!url) {
    console.error("ensure-db: DATABASE_URL missing at runtime");
    return;
  }
  const client = new Client({
    connectionString: url,
    ssl: url.includes("localhost") ? false : { rejectUnauthorized: false },
    connectionTimeoutMillis: 30_000,
  });
  await client.connect();
  try {
    const found = await client.query(`SELECT to_regclass('public."User"') AS rel`);
    if (!found.rows[0]?.rel) {
      const file = migrationPath();
      if (!file) {
        console.error("ensure-db: migration.sql not found");
        return;
      }
      console.log("ensure-db: applying Postgres schema");
      await client.query(readFileSync(file, "utf8"));
    }
    await client.query(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "email" TEXT`);
    await client.query(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emailVerifiedAt" TIMESTAMP(3)`);
    await client.query(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emailVerifyHash" TEXT`);
    await client.query(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emailVerifyExpires" TIMESTAMP(3)`);
    await client.query(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "termsAcceptedAt" TIMESTAMP(3)`);
    await client.query(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "adultConfirmedAt" TIMESTAMP(3)`);
    await client.query(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "privacyAcceptedAt" TIMESTAMP(3)`);
    await client.query(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "googleId" TEXT`);
    await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS "User_googleId_key" ON "User"("googleId")`);
    await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email")`);
    await client.query(`ALTER TABLE "Comment" ADD COLUMN IF NOT EXISTS "authorIp" TEXT`);
    await client.query(`CREATE INDEX IF NOT EXISTS "Comment_authorIp_createdAt_idx" ON "Comment"("authorIp", "createdAt")`);
    await client.query(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isMaster" BOOLEAN NOT NULL DEFAULT false`);
    await client.query(`CREATE INDEX IF NOT EXISTS "User_isMaster_idx" ON "User"("isMaster")`);
    await client.query(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "pointsEarnedDate" TEXT`);
    await client.query(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "pointsEarnedToday" INTEGER NOT NULL DEFAULT 0`);
    await client.query(`ALTER TYPE "BoardType" ADD VALUE IF NOT EXISTS 'NOTICE'`).catch(() => undefined);
    await client.query(`UPDATE "Mark" SET "pricePoints" = 3000, "minLevel" = 1`);
    await client.query(`UPDATE "ProfileCosmetic" SET "pricePoints" = 3000, "minLevel" = 1`);
  } finally {
    await client.end().catch(() => undefined);
  }
}

async function seedIfEmpty() {
  const { createPrismaClient } = await import("@/lib/create-prisma-client");
  const prisma = createPrismaClient();
  const { buildLevelRows } = await import("@/lib/levels");
  await prisma.levelExp.createMany({ data: buildLevelRows(), skipDuplicates: true });
  const users = await prisma.user.count();
  if (users > 0) {
    await prisma.$disconnect();
    return;
  }
  await prisma.user.create({
    data: {
      nickname: "펠트딜러",
      passwordHash: hashPassword(SEED_ACCOUNT_PASSWORD),
      isDealerVerified: true,
      isAdmin: true,
      level: 8,
      exp: 7400,
      points: 8200,
    },
  });
  console.log("ensure-db: created admin 펠트딜러");
  await prisma.$disconnect();
}

async function ensureMasterAccount() {
  const { createPrismaClient } = await import("@/lib/create-prisma-client");
  const prisma = createPrismaClient();
  try {
    await prisma.user.upsert({
      where: { nickname: MASTER_ACCOUNT_NICKNAME },
      create: {
        nickname: MASTER_ACCOUNT_NICKNAME,
        passwordHash: hashPassword(MASTER_ACCOUNT_PASSWORD),
        isAdmin: true,
        isMaster: true,
        isDealerVerified: true,
        level: 250,
        exp: 24900,
        points: 999999,
        termsAcceptedAt: new Date(),
      },
      update: {
        passwordHash: hashPassword(MASTER_ACCOUNT_PASSWORD),
        isAdmin: true,
        isMaster: true,
        isDealerVerified: true,
        level: 250,
        exp: 24900,
      },
    });
    console.log("ensure-db: master account ready");
  } finally {
    await prisma.$disconnect();
  }
}

async function ensureLevelTable() {
  const { createPrismaClient } = await import("@/lib/create-prisma-client");
  const { buildLevelRows } = await import("@/lib/levels");
  const prisma = createPrismaClient();
  try {
    await prisma.levelExp.createMany({ data: buildLevelRows(), skipDuplicates: true });
    for (const row of buildLevelRows()) {
      await prisma.levelExp.update({
        where: { level: row.level },
        data: { requiredExp: row.requiredExp, markPurchasePoints: 0 },
      });
    }
  } finally {
    await prisma.$disconnect();
  }
}

export function ensureDb() {
  boot ??= applySchema()
    .then(seedIfEmpty)
    .then(ensureLevelTable)
    .then(ensureMasterAccount)
    .then(async () => {
      const { purgeDemoCatalog } = await import("@/lib/purge-demo-catalog");
      await purgeDemoCatalog();
    })
    .catch((error) => {
      console.error("ensure-db failed", error);
    });
  return boot;
}
