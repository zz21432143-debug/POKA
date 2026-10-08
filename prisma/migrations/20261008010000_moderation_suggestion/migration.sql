-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "AccountStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'BANNED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "status" "AccountStatus" NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "suspendedUntil" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "banReason" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "signupIp" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastLoginAt" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "User_status_idx" ON "User"("status");

ALTER TYPE "BoardType" ADD VALUE IF NOT EXISTS 'SUGGESTION';

ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "isPrivate" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "unlockPasswordHash" TEXT;

ALTER TABLE "Report" ADD COLUMN IF NOT EXISTS "targetType" TEXT NOT NULL DEFAULT 'post';
ALTER TABLE "Report" ADD COLUMN IF NOT EXISTS "commentId" TEXT;
ALTER TABLE "Report" ALTER COLUMN "postId" DROP NOT NULL;
ALTER TABLE "Report" ALTER COLUMN "status" SET DEFAULT 'pending';
UPDATE "Report" SET "targetType" = 'post' WHERE "targetType" IS NULL OR "targetType" = '';
UPDATE "Report" SET "status" = lower("status") WHERE "status" IN ('PENDING', 'RESOLVED', 'DISMISSED');

DROP INDEX IF EXISTS "Report_postId_reporterId_key";
CREATE INDEX IF NOT EXISTS "Report_reporterId_postId_idx" ON "Report"("reporterId", "postId");
CREATE INDEX IF NOT EXISTS "Report_reporterId_commentId_idx" ON "Report"("reporterId", "commentId");
CREATE INDEX IF NOT EXISTS "Report_targetType_createdAt_idx" ON "Report"("targetType", "createdAt");

DO $$ BEGIN
  ALTER TABLE "Report" ADD CONSTRAINT "Report_commentId_fkey"
    FOREIGN KEY ("commentId") REFERENCES "Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
