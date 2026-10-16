-- 금지어별 「구인 글에서는 허용」(예: 「문자지원」 속 「자지」) — 여러 번 실행해도 같은 결과
ALTER TABLE "ForbiddenWord" ADD COLUMN IF NOT EXISTS "jobAllowed" BOOLEAN NOT NULL DEFAULT false;
UPDATE "ForbiddenWord" SET "jobAllowed" = true WHERE "word" = '자지' AND "jobAllowed" = false;
