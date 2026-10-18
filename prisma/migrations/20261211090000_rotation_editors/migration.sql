-- 딜러 로테이션 공동 편집: 게임별 편집 코드 + 편집자 — 여러 번 실행해도 같은 결과
ALTER TABLE "RotationMeta" ADD COLUMN IF NOT EXISTS "editCode" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "RotationMeta_editCode_key" ON "RotationMeta"("editCode");

CREATE TABLE IF NOT EXISTS "RotationEditor" (
  "gameId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RotationEditor_pkey" PRIMARY KEY ("gameId", "userId")
);
CREATE INDEX IF NOT EXISTS "RotationEditor_userId_idx" ON "RotationEditor"("userId");
