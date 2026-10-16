-- 오목: 대국 시작 시각(결과 화면 걸린 시간 · 추가만)
ALTER TABLE "OmokGame" ADD COLUMN IF NOT EXISTS "startedAt" TIMESTAMP(3);
