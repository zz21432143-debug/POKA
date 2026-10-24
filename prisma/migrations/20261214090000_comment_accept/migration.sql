-- 좋은 답변 채택: 댓글에 채택 시각. 글 하나에 채택 하나만(부분 유니크 인덱스). 여러 번 실행해도 같은 결과
ALTER TABLE "Comment" ADD COLUMN IF NOT EXISTS "acceptedAt" TIMESTAMP(3);
CREATE UNIQUE INDEX IF NOT EXISTS "Comment_one_accepted_per_post" ON "Comment" ("postId") WHERE "acceptedAt" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "Comment_authorId_acceptedAt_idx" ON "Comment" ("authorId", "acceptedAt");
