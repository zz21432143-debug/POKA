-- 윷놀이 도전 줄(승자 연전) — 추가만
ALTER TABLE "YutGame" ADD COLUMN IF NOT EXISTS "queueJson" TEXT NOT NULL DEFAULT '';
