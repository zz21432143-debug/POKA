-- 구인 글 근무 환경 칩(추가만)
ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "jobTags" TEXT;
