ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "withdrawnAt" TIMESTAMP(3);

ALTER TABLE "SiteSetting" ALTER COLUMN "footerEmail" SET DEFAULT 'POKA4444444@gmail.com';
UPDATE "SiteSetting"
SET "footerEmail" = 'POKA4444444@gmail.com'
WHERE "footerEmail" IS NULL OR "footerEmail" = '' OR "footerEmail" = 'contact@pokerwiki.co.kr';
