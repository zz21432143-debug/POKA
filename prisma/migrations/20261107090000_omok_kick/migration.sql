-- 요괴 오목: 방장이 내보낸 사람(같은 방에 다시 못 앉음)
ALTER TABLE "OmokGame" ADD COLUMN IF NOT EXISTS "kickedJson" TEXT NOT NULL DEFAULT '';
