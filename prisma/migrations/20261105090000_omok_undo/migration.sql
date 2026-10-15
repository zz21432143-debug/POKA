-- 요괴 오목 물리기: 요청 · 남은 횟수 {ask, used, denied}
ALTER TABLE "OmokGame" ADD COLUMN IF NOT EXISTS "undoJson" TEXT NOT NULL DEFAULT '';
