-- 게시판 「중요」 고정: 관리자가 지정, 게시판 목록 위에 따로 보임
ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "pinnedAt" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "Post_boardType_pinnedAt_idx" ON "Post"("boardType", "pinnedAt");
