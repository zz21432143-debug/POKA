-- 요괴 오목 친구 대전: 방 하나 = 한 판(수 목록 · 차례 시작 시각 · 결과)
CREATE TABLE IF NOT EXISTS "OmokGame" (
  "id" TEXT NOT NULL,
  "hostId" TEXT NOT NULL,
  "blackId" TEXT,
  "whiteId" TEXT,
  "movesJson" TEXT NOT NULL DEFAULT '[]',
  "status" TEXT NOT NULL DEFAULT 'waiting',
  "winner" INTEGER NOT NULL DEFAULT 0,
  "endReason" TEXT NOT NULL DEFAULT '',
  "version" INTEGER NOT NULL DEFAULT 0,
  "turnAt" TIMESTAMP(3),
  "emoteJson" TEXT NOT NULL DEFAULT '',
  "nextId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OmokGame_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "OmokGame_status_updatedAt_idx" ON "OmokGame"("status", "updatedAt");
CREATE INDEX IF NOT EXISTS "OmokGame_hostId_createdAt_idx" ON "OmokGame"("hostId", "createdAt");
