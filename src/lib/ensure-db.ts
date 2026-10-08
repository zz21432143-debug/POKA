import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import dns from "node:dns";
import { Client } from "pg";
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
    const found = await client.query(`
      SELECT to_regclass('public."User"') AS rel
    `);
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
    await client.query(`ALTER TYPE "BoardType" ADD VALUE IF NOT EXISTS 'SUGGESTION'`).catch(() => undefined);
    await client.query(`
      DO $$ BEGIN
        CREATE TYPE "AccountStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'BANNED');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);
    await client.query(
      `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "status" "AccountStatus" NOT NULL DEFAULT 'ACTIVE'`,
    );
    await client.query(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "suspendedUntil" TIMESTAMP(3)`);
    await client.query(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "banReason" TEXT`);
    await client.query(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "signupIp" TEXT`);
    await client.query(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastLoginAt" TIMESTAMP(3)`);
    await client.query(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "withdrawnAt" TIMESTAMP(3)`);
    await client.query(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "nicknameChangeCount" INTEGER NOT NULL DEFAULT 0`);
    await client.query(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "nicknameTickets" INTEGER NOT NULL DEFAULT 0`);
    await client.query(`CREATE INDEX IF NOT EXISTS "User_status_idx" ON "User"("status")`);
    await client.query(`ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "isPrivate" BOOLEAN NOT NULL DEFAULT false`);
    await client.query(`ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "unlockPasswordHash" TEXT`);
    await client.query(`ALTER TABLE "Report" ADD COLUMN IF NOT EXISTS "targetType" TEXT`);
    await client.query(`UPDATE "Report" SET "targetType" = 'post' WHERE "targetType" IS NULL OR "targetType" = ''`);
    await client.query(`ALTER TABLE "Report" ALTER COLUMN "targetType" SET DEFAULT 'post'`);
    await client.query(`ALTER TABLE "Report" ADD COLUMN IF NOT EXISTS "commentId" TEXT`);
    await client.query(`ALTER TABLE "Report" ALTER COLUMN "postId" DROP NOT NULL`).catch(() => undefined);
    await client.query(`ALTER TABLE "Report" ALTER COLUMN "status" SET DEFAULT 'pending'`).catch(() => undefined);
    await client.query(`DROP INDEX IF EXISTS "Report_postId_reporterId_key"`);
    await client.query(
      `CREATE INDEX IF NOT EXISTS "Report_reporterId_postId_idx" ON "Report"("reporterId", "postId")`,
    );
    await client.query(
      `CREATE INDEX IF NOT EXISTS "Report_reporterId_commentId_idx" ON "Report"("reporterId", "commentId")`,
    );
    await client.query(
      `CREATE INDEX IF NOT EXISTS "Report_targetType_createdAt_idx" ON "Report"("targetType", "createdAt")`,
    );
    await client.query(`
      DO $$ BEGIN
        ALTER TABLE "Report" ADD CONSTRAINT "Report_commentId_fkey"
          FOREIGN KEY ("commentId") REFERENCES "Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);
    await client.query(`
      DO $$ BEGIN
        CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN', 'MASTER');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);
    await client.query(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "role" "UserRole" NOT NULL DEFAULT 'USER'`);
    await client.query(`CREATE INDEX IF NOT EXISTS "User_role_idx" ON "User"("role")`);
    await client.query(`UPDATE "User" SET "role" = 'MASTER' WHERE "isMaster" = true`);
    await client.query(`UPDATE "User" SET "role" = 'ADMIN' WHERE "isAdmin" = true AND "isMaster" = false`);
    await client.query(`
      CREATE TABLE IF NOT EXISTS "ForbiddenWord" (
        "id" TEXT NOT NULL,
        "word" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "ForbiddenWord_pkey" PRIMARY KEY ("id")
      )
    `);
    await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS "ForbiddenWord_word_key" ON "ForbiddenWord"("word")`);
    await client.query(`
      CREATE TABLE IF NOT EXISTS "SiteSetting" (
        "id" TEXT NOT NULL,
        "noticeBanner" TEXT,
        "footerEmail" TEXT NOT NULL DEFAULT 'POKA4444444@gmail.com',
        "kakaoChannelUrl" TEXT,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "SiteSetting_pkey" PRIMARY KEY ("id")
      )
    `);
    await client.query(`
      UPDATE "SiteSetting"
      SET "footerEmail" = 'POKA4444444@gmail.com'
      WHERE "footerEmail" IS NULL OR "footerEmail" = '' OR "footerEmail" = 'contact@pokerwiki.co.kr'
    `).catch(() => undefined);
    await client.query(`
      UPDATE "SiteSetting"
      SET "kakaoChannelUrl" = 'kakaotalk://addfriend?id=POKA1'
      WHERE "kakaoChannelUrl" IS NULL OR "kakaoChannelUrl" = '' OR "kakaoChannelUrl" = 'https://open.kakao.com/o/gewUD9jc'
    `).catch(() => undefined);
    await client.query(`
      UPDATE "Post" SET "authorIp" = NULL
      WHERE "authorIp" IS NOT NULL AND "createdAt" < NOW() - INTERVAL '90 days'
    `).catch(() => undefined);
    await client.query(`
      UPDATE "Comment" SET "authorIp" = NULL
      WHERE "authorIp" IS NOT NULL AND "createdAt" < NOW() - INTERVAL '90 days'
    `).catch(() => undefined);
    await client.query(`
      DELETE FROM "AuditLog"
      WHERE "kind" = 'BAN_REJOIN' AND "createdAt" < NOW() - INTERVAL '365 days'
    `).catch(() => undefined);
    await client.query(`
      DELETE FROM "AuditLog"
      WHERE "kind" = 'WITHDRAW_REJOIN' AND "createdAt" < NOW() - INTERVAL '7 days'
    `).catch(() => undefined);
    await client.query(`UPDATE "Mark" SET "pricePoints" = 3000, "minLevel" = 1`);
    await client.query(`UPDATE "ProfileCosmetic" SET "pricePoints" = 3000, "minLevel" = 1`);
    await client.query(`UPDATE "Mark" SET "imageUrl" = '/marks/team-top.svg' WHERE "slug" = 'team-a'`);
    await client.query(`UPDATE "Mark" SET "imageUrl" = '/marks/team-plime.svg' WHERE "slug" = 'team-b'`);
    await client.query(`UPDATE "Mark" SET "imageUrl" = '/marks/team-ham.svg' WHERE "slug" = 'team-c'`);
    await client.query(`UPDATE "Mark" SET "imageUrl" = '/marks/team-rocket.svg' WHERE "slug" = 'team-d'`);
    await client.query(`UPDATE "Mark" SET "imageUrl" = '/marks/team-gunner.svg' WHERE "slug" = 'team-e'`);
    await client.query(`UPDATE "Mark" SET "imageUrl" = '/marks/team-doo.svg' WHERE "slug" = 'team-f'`);
    await client.query(`
      UPDATE "User" AS u
      SET "profileMarkImageUrl" = m."imageUrl"
      FROM "Mark" AS m
      WHERE u."equippedMarkId" = m.id
    `);
    await client.query(`
      UPDATE "User"
      SET "profileMarkImageUrl" = NULL
      WHERE "profileMarkImageUrl" LIKE '/images/badges/%'
    `);
  } finally {
    await client.end().catch(() => undefined);
  }
}

async function ensureMasterAccount() {
  const { ensureLaunchMaster } = await import("@/lib/wipe-community");
  const user = await ensureLaunchMaster();
  if (user) console.log("ensure-db: master is", user.nickname, "tickets", user.nicknameTickets);
}

async function ensureLevelTable() {
  const { prisma } = await import("@/lib/db");
  const { buildLevelRows, MAX_LEVEL } = await import("@/lib/levels");
  const n = await prisma.levelExp.count();
  if (n >= MAX_LEVEL) return;
  await prisma.levelExp.createMany({ data: buildLevelRows(), skipDuplicates: true });
}

export function ensureDb() {
  boot ??= applySchema()
    .then(async () => {
      const { wipeCommunityForLaunch } = await import("@/lib/wipe-community");
      await wipeCommunityForLaunch();
    })
    .then(ensureLevelTable)
    .then(ensureMasterAccount)
    .then(async () => {
      const { ensureSiteSettingsRow, ensureDefaultForbiddenWords } = await import("@/lib/site-settings");
      await ensureSiteSettingsRow();
      await ensureDefaultForbiddenWords();
    })
    .then(async () => {
      const { purgeDemoCatalog, clearAutoDealerVerified } = await import("@/lib/purge-demo-catalog");
      await purgeDemoCatalog();
      await clearAutoDealerVerified();
    })
    .catch((error) => {
      console.error("ensure-db failed", error);
    });
  return boot;
}
