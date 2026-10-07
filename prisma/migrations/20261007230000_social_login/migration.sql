ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "googleId" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "User_googleId_key" ON "User"("googleId");
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "privacyAcceptedAt" TIMESTAMP(3);
ALTER TABLE "Comment" ADD COLUMN IF NOT EXISTS "authorIp" TEXT;
CREATE INDEX IF NOT EXISTS "Comment_authorIp_createdAt_idx" ON "Comment"("authorIp", "createdAt");
