-- 게임 현황판(토너먼트 시계): 계정마다 따로 저장 · 보기 전용 TV 링크
CREATE TABLE IF NOT EXISTS "GameBoard" (
  "id" TEXT NOT NULL,
  "ownerId" TEXT NOT NULL,
  "name" TEXT NOT NULL DEFAULT '메인 토너먼트',
  "shareToken" TEXT,
  "dataJson" TEXT NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GameBoard_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "GameBoard_shareToken_key" ON "GameBoard"("shareToken");
CREATE INDEX IF NOT EXISTS "GameBoard_ownerId_createdAt_idx" ON "GameBoard"("ownerId", "createdAt");
