-- 딜러 로테이션: 스태프(출근 체크만 · 딜에 안 들어감) — 여러 번 실행해도 같은 결과
ALTER TABLE "RotationDealer" ADD COLUMN IF NOT EXISTS "staff" BOOLEAN NOT NULL DEFAULT false;
