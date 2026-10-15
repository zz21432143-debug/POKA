-- 요괴 윷놀이: 방 하나 = 한 판(1:1 ~ 4:4 팀전 · 자리 · 레디 · 게임 상태 JSON)
CREATE TABLE IF NOT EXISTS "YutGame" (
  "id" TEXT NOT NULL,
  "code" TEXT,
  "hostId" TEXT NOT NULL,
  "mode" INTEGER NOT NULL DEFAULT 1,
  "status" TEXT NOT NULL DEFAULT 'waiting',
  "seatsJson" TEXT NOT NULL DEFAULT '[]',
  "stateJson" TEXT NOT NULL DEFAULT '',
  "winner" TEXT NOT NULL DEFAULT '',
  "endReason" TEXT NOT NULL DEFAULT '',
  "version" INTEGER NOT NULL DEFAULT 0,
  "turnAt" TIMESTAMP(3),
  "emoteJson" TEXT NOT NULL DEFAULT '',
  "kickedJson" TEXT NOT NULL DEFAULT '',
  "isPrivate" BOOLEAN NOT NULL DEFAULT false,
  "withBots" BOOLEAN NOT NULL DEFAULT false,
  "nextId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "YutGame_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "YutGame_code_key" ON "YutGame"("code");
CREATE INDEX IF NOT EXISTS "YutGame_status_updatedAt_idx" ON "YutGame"("status", "updatedAt");
CREATE INDEX IF NOT EXISTS "YutGame_hostId_createdAt_idx" ON "YutGame"("hostId", "createdAt");
