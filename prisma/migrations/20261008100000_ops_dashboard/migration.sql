DO $$ BEGIN
  CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN', 'MASTER');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "role" "UserRole" NOT NULL DEFAULT 'USER';
CREATE INDEX IF NOT EXISTS "User_role_idx" ON "User"("role");
UPDATE "User" SET "role" = 'MASTER' WHERE "isMaster" = true;
UPDATE "User" SET "role" = 'ADMIN' WHERE "isAdmin" = true AND "isMaster" = false;

CREATE TABLE IF NOT EXISTS "ForbiddenWord" (
  "id" TEXT NOT NULL,
  "word" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ForbiddenWord_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "ForbiddenWord_word_key" ON "ForbiddenWord"("word");

CREATE TABLE IF NOT EXISTS "SiteSetting" (
  "id" TEXT NOT NULL,
  "noticeBanner" TEXT,
  "footerEmail" TEXT NOT NULL DEFAULT 'contact@pokerwiki.co.kr',
  "kakaoChannelUrl" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SiteSetting_pkey" PRIMARY KEY ("id")
);

INSERT INTO "SiteSetting" ("id", "footerEmail", "kakaoChannelUrl", "updatedAt")
VALUES ('default', 'contact@pokerwiki.co.kr', 'https://open.kakao.com/o/gewUD9jc', CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;
