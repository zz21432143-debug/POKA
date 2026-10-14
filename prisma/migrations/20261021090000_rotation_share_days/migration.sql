-- 로테이션 공유 링크 열림 기간: 1 = 근무일 다음 날까지(기본) · 3 = 근무일부터 3일 · 0 = 계속(공유를 끌 때까지)
ALTER TABLE "RotationMeta" ADD COLUMN IF NOT EXISTS "shareDays" INTEGER NOT NULL DEFAULT 1;
