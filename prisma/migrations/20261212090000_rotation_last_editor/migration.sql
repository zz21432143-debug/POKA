-- 딜러 로테이션: 마지막으로 바꾼 계정 · 시각(같이 편집 안내) — 여러 번 실행해도 같은 결과
ALTER TABLE "RotationMeta" ADD COLUMN IF NOT EXISTS "lastEditorId" TEXT;
ALTER TABLE "RotationMeta" ADD COLUMN IF NOT EXISTS "lastEditedAt" TIMESTAMP(3);
