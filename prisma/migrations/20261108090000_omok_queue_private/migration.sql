-- 요괴 오목: 다음 판 도전 줄 · 비공개 방(로비에 안 보임)
ALTER TABLE "OmokGame" ADD COLUMN IF NOT EXISTS "queueJson" TEXT NOT NULL DEFAULT '';
ALTER TABLE "OmokGame" ADD COLUMN IF NOT EXISTS "isPrivate" BOOLEAN NOT NULL DEFAULT false;
