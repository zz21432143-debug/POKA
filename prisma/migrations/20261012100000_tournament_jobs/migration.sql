-- 대회 딜러 구인 + 여러 날짜·모집 마감일.
-- 여러 번 실행해도 안전하도록(IF NOT EXISTS) 작성했습니다. Vercel 빌드 때 scripts/apply-schema.cjs 가 먼저 실행합니다.

ALTER TYPE "JobKind" ADD VALUE IF NOT EXISTS 'TOURNAMENT';

ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "jobEndDate" TEXT;
ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "jobDeadline" TEXT;
