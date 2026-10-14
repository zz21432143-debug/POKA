-- 매장 도구에서 따로 저장해 두는 것(계정마다): 딜러 명단 · 현황판 구조 · 지운 로테이션 게임(7일 휴지통)
CREATE TABLE IF NOT EXISTS "ToolSaved" (
  "id" TEXT NOT NULL,
  "ownerId" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "name" TEXT NOT NULL DEFAULT '',
  "dataJson" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ToolSaved_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ToolSaved_ownerId_kind_createdAt_idx" ON "ToolSaved"("ownerId", "kind", "createdAt");
