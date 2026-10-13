-- 딜러 로테이션: 게임(근무일·이벤트)마다 따로. RotationMeta 한 행 = 게임 하나
ALTER TABLE "RotationMeta" ADD COLUMN IF NOT EXISTS "name" TEXT NOT NULL DEFAULT '메인 게임';
ALTER TABLE "RotationMeta" ADD COLUMN IF NOT EXISTS "workDate" TEXT;
ALTER TABLE "RotationMeta" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "RotationDealer" ADD COLUMN IF NOT EXISTS "gameId" TEXT NOT NULL DEFAULT 'default';
CREATE INDEX IF NOT EXISTS "RotationDealer_gameId_sort_idx" ON "RotationDealer"("gameId", "sort");
CREATE INDEX IF NOT EXISTS "RotationMeta_workDate_createdAt_idx" ON "RotationMeta"("workDate", "createdAt");
