-- CreateTable
CREATE TABLE "CommentVote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "commentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CommentVote_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "Comment" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CommentVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TickerEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kind" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "href" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Comment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "postId" TEXT,
    "authorId" TEXT,
    "content" TEXT NOT NULL,
    "isAttendanceCheck" BOOLEAN NOT NULL DEFAULT false,
    "upvoteCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Comment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Comment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Comment" ("authorId", "content", "createdAt", "id", "isAttendanceCheck", "postId", "updatedAt") SELECT "authorId", "content", "createdAt", "id", "isAttendanceCheck", "postId", "updatedAt" FROM "Comment";
DROP TABLE "Comment";
ALTER TABLE "new_Comment" RENAME TO "Comment";
CREATE INDEX "Comment_postId_idx" ON "Comment"("postId");
CREATE INDEX "Comment_postId_upvoteCount_idx" ON "Comment"("postId", "upvoteCount");
CREATE INDEX "Comment_authorId_isAttendanceCheck_createdAt_idx" ON "Comment"("authorId", "isAttendanceCheck", "createdAt");
CREATE TABLE "new_Post" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "boardType" TEXT NOT NULL,
    "authorId" TEXT,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "handReviewJson" TEXT,
    "upvoteCount" INTEGER NOT NULL DEFAULT 0,
    "downvoteCount" INTEGER NOT NULL DEFAULT 0,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "authorIp" TEXT,
    "isAttendanceThread" BOOLEAN NOT NULL DEFAULT false,
    "attendanceDate" TEXT,
    "jobKind" TEXT,
    "jobLocation" TEXT,
    "jobPay" TEXT,
    "jobSchedule" TEXT,
    "jobHeadcount" TEXT,
    "jobBenefits" TEXT,
    "jobTeamGoal" TEXT,
    "isPaid" BOOLEAN NOT NULL DEFAULT false,
    "bannerSlot" INTEGER,
    "bannerImageUrl" TEXT,
    "promoLocation" TEXT,
    "promoTag" TEXT,
    "jobFilled" BOOLEAN NOT NULL DEFAULT false,
    "hidden" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Post_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Post" ("attendanceDate", "authorId", "authorIp", "bannerImageUrl", "bannerSlot", "boardType", "content", "createdAt", "downvoteCount", "handReviewJson", "hidden", "id", "isAttendanceThread", "isPaid", "jobBenefits", "jobHeadcount", "jobKind", "jobLocation", "jobPay", "jobSchedule", "jobTeamGoal", "title", "updatedAt", "upvoteCount") SELECT "attendanceDate", "authorId", "authorIp", "bannerImageUrl", "bannerSlot", "boardType", "content", "createdAt", "downvoteCount", "handReviewJson", "hidden", "id", "isAttendanceThread", "isPaid", "jobBenefits", "jobHeadcount", "jobKind", "jobLocation", "jobPay", "jobSchedule", "jobTeamGoal", "title", "updatedAt", "upvoteCount" FROM "Post";
DROP TABLE "Post";
ALTER TABLE "new_Post" RENAME TO "Post";
CREATE UNIQUE INDEX "Post_attendanceDate_key" ON "Post"("attendanceDate");
CREATE UNIQUE INDEX "Post_bannerSlot_key" ON "Post"("bannerSlot");
CREATE INDEX "Post_boardType_createdAt_idx" ON "Post"("boardType", "createdAt");
CREATE INDEX "Post_authorId_idx" ON "Post"("authorId");
CREATE INDEX "Post_isAttendanceThread_attendanceDate_idx" ON "Post"("isAttendanceThread", "attendanceDate");
CREATE INDEX "Post_jobKind_isPaid_idx" ON "Post"("jobKind", "isPaid");
CREATE INDEX "Post_hidden_boardType_createdAt_idx" ON "Post"("hidden", "boardType", "createdAt");
CREATE INDEX "Post_authorIp_createdAt_idx" ON "Post"("authorIp", "createdAt");
CREATE INDEX "Post_upvoteCount_viewCount_idx" ON "Post"("upvoteCount", "viewCount");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "CommentVote_commentId_userId_key" ON "CommentVote"("commentId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "TickerEvent_kind_key" ON "TickerEvent"("kind");

-- CreateIndex
CREATE INDEX "TickerEvent_createdAt_idx" ON "TickerEvent"("createdAt");
