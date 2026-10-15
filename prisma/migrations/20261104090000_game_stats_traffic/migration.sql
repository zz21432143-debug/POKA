-- 게임 전적(오목 · 알까기 · 체스 공통): 끝난 판 하나 = 한 줄(gameId 중복 없음)
CREATE TABLE IF NOT EXISTS "GameResult" (
  "id" TEXT NOT NULL,
  "game" TEXT NOT NULL,
  "gameId" TEXT NOT NULL,
  "winnerId" TEXT,
  "loserId" TEXT,
  "playerAId" TEXT NOT NULL,
  "playerBId" TEXT NOT NULL,
  "draw" BOOLEAN NOT NULL DEFAULT false,
  "reason" TEXT NOT NULL DEFAULT '',
  "moves" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GameResult_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "GameResult_gameId_key" ON "GameResult"("gameId");
CREATE INDEX IF NOT EXISTS "GameResult_game_createdAt_idx" ON "GameResult"("game", "createdAt");
CREATE INDEX IF NOT EXISTS "GameResult_winnerId_idx" ON "GameResult"("winnerId");
CREATE INDEX IF NOT EXISTS "GameResult_loserId_idx" ON "GameResult"("loserId");

-- 관전자: 대국 화면을 보고 있는 사람(최근 15초 안에 신호)
CREATE TABLE IF NOT EXISTS "GameWatch" (
  "gameId" TEXT NOT NULL,
  "viewer" TEXT NOT NULL,
  "seenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GameWatch_pkey" PRIMARY KEY ("gameId", "viewer")
);
CREATE INDEX IF NOT EXISTS "GameWatch_gameId_seenAt_idx" ON "GameWatch"("gameId", "seenAt");

-- 유입 경로: 날짜(KST) · 출처별 방문 · 가입 수
CREATE TABLE IF NOT EXISTS "TrafficDaily" (
  "day" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "visits" INTEGER NOT NULL DEFAULT 0,
  "signups" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "TrafficDaily_pkey" PRIMARY KEY ("day", "source")
);
