-- 오목 자리비움(자동) 표시(추가만)
ALTER TABLE "OmokGame" ADD COLUMN IF NOT EXISTS "autoJson" TEXT NOT NULL DEFAULT '';
