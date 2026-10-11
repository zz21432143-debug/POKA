-- 구인구직 v2 + 스키마 정리.
-- 여러 번 실행해도 안전하도록(IF NOT EXISTS / 조건부 UPDATE) 작성했습니다.
-- Vercel 빌드 때 scripts/apply-schema.cjs 가 새 코드보다 먼저 실행합니다.

-- 1) 앱 부팅 패치(ensure-db)로만 추가되던 칸을 마이그레이션에도 남깁니다.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "adultConfirmedAt" TIMESTAMP(3);
ALTER TABLE "SiteSetting" ALTER COLUMN "id" SET DEFAULT 'default';

-- 2) 차비 금액 전용 칸. 예전에는 jobBenefits 칸을 빌려 썼습니다.
ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "jobTravelPayAmount" TEXT;
UPDATE "Post"
SET "jobTravelPayAmount" = regexp_replace("jobBenefits", '[^0-9]', '', 'g'),
    "jobBenefits" = NULL
WHERE "jobKind" IN ('APPLY', 'URGENT')
  AND "jobTravelPay" = true
  AND "jobTravelPayAmount" IS NULL
  AND "jobBenefits" ~ '^[0-9,]+$';

-- 3) 끌어올리기 정렬 기준. 기존 글은 등록 시각으로 채워 순서를 유지합니다.
ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "bumpedAt" TIMESTAMP(3);
UPDATE "Post" SET "bumpedAt" = "createdAt" WHERE "bumpedAt" IS NULL;
ALTER TABLE "Post" ALTER COLUMN "bumpedAt" SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Post" ALTER COLUMN "bumpedAt" SET NOT NULL;
CREATE INDEX IF NOT EXISTS "Post_boardType_bumpedAt_idx" ON "Post"("boardType", "bumpedAt");

-- 4) 사이트 안 지원하기
CREATE TABLE IF NOT EXISTS "JobApplication" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "applicantId" TEXT NOT NULL,
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "JobApplication_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "JobApplication_postId_applicantId_key" ON "JobApplication"("postId", "applicantId");
CREATE INDEX IF NOT EXISTS "JobApplication_applicantId_createdAt_idx" ON "JobApplication"("applicantId", "createdAt");
DO $$ BEGIN
  ALTER TABLE "JobApplication" ADD CONSTRAINT "JobApplication_postId_fkey"
    FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "JobApplication" ADD CONSTRAINT "JobApplication_applicantId_fkey"
    FOREIGN KEY ("applicantId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 5) 급구 웹 푸시 구독
CREATE TABLE IF NOT EXISTS "PushSubscription" (
    "id" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");
CREATE INDEX IF NOT EXISTS "PushSubscription_region_idx" ON "PushSubscription"("region");
DO $$ BEGIN
  ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
