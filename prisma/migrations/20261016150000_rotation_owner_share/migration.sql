-- 딜러 로테이션: 게임마다 주인(계정) · 보기 전용 공유 링크 · 최대 연속 딜(분)
ALTER TABLE "RotationMeta" ADD COLUMN IF NOT EXISTS "ownerId" TEXT;
ALTER TABLE "RotationMeta" ADD COLUMN IF NOT EXISTS "shareToken" TEXT;
ALTER TABLE "RotationMeta" ADD COLUMN IF NOT EXISTS "maxStreakMinutes" INTEGER NOT NULL DEFAULT 0;
CREATE UNIQUE INDEX IF NOT EXISTS "RotationMeta_shareToken_key" ON "RotationMeta"("shareToken");
CREATE INDEX IF NOT EXISTS "RotationMeta_ownerId_workDate_idx" ON "RotationMeta"("ownerId", "workDate");
-- 주인 없는 예전 게임은 가장 먼저 만든 마스터 계정 것으로
UPDATE "RotationMeta" SET "ownerId" = (SELECT "id" FROM "User" WHERE "isMaster" = true ORDER BY "createdAt" ASC LIMIT 1)
WHERE "ownerId" IS NULL;
