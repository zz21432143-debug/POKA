-- CreateTable
CREATE TABLE "PostVote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PostVote_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PostVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "postId" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Report_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Report_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Mark" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "pricePoints" INTEGER NOT NULL,
    "minLevel" INTEGER NOT NULL DEFAULT 1
);

-- CreateTable
CREATE TABLE "UserMark" (
    "userId" TEXT NOT NULL,
    "markId" TEXT NOT NULL,
    "purchasedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY ("userId", "markId"),
    CONSTRAINT "UserMark_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UserMark_markId_fkey" FOREIGN KEY ("markId") REFERENCES "Mark" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Post" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "boardType" TEXT NOT NULL,
    "authorId" TEXT,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "handReviewJson" TEXT,
    "upvoteCount" INTEGER NOT NULL DEFAULT 0,
    "downvoteCount" INTEGER NOT NULL DEFAULT 0,
    "authorIp" TEXT,
    "isAttendanceThread" BOOLEAN NOT NULL DEFAULT false,
    "attendanceDate" TEXT,
    "jobKind" TEXT,
    "jobLocation" TEXT,
    "jobPay" TEXT,
    "jobSchedule" TEXT,
    "jobHeadcount" TEXT,
    "isPaid" BOOLEAN NOT NULL DEFAULT false,
    "bannerSlot" INTEGER,
    "bannerImageUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Post_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Post" ("attendanceDate", "authorId", "authorIp", "boardType", "content", "createdAt", "downvoteCount", "handReviewJson", "id", "isAttendanceThread", "title", "updatedAt", "upvoteCount") SELECT "attendanceDate", "authorId", "authorIp", "boardType", "content", "createdAt", "downvoteCount", "handReviewJson", "id", "isAttendanceThread", "title", "updatedAt", "upvoteCount" FROM "Post";
DROP TABLE "Post";
ALTER TABLE "new_Post" RENAME TO "Post";
CREATE UNIQUE INDEX "Post_attendanceDate_key" ON "Post"("attendanceDate");
CREATE UNIQUE INDEX "Post_bannerSlot_key" ON "Post"("bannerSlot");
CREATE INDEX "Post_boardType_createdAt_idx" ON "Post"("boardType", "createdAt");
CREATE INDEX "Post_authorId_idx" ON "Post"("authorId");
CREATE INDEX "Post_isAttendanceThread_attendanceDate_idx" ON "Post"("isAttendanceThread", "attendanceDate");
CREATE INDEX "Post_jobKind_isPaid_idx" ON "Post"("jobKind", "isPaid");
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nickname" TEXT NOT NULL,
    "profileMarkImageUrl" TEXT,
    "equippedMarkId" TEXT,
    "level" INTEGER NOT NULL DEFAULT 1,
    "exp" INTEGER NOT NULL DEFAULT 0,
    "points" INTEGER NOT NULL DEFAULT 0,
    "isDealerVerified" BOOLEAN NOT NULL DEFAULT false,
    "lastAttendanceDate" TEXT,
    "attendanceStreak" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "User_equippedMarkId_fkey" FOREIGN KEY ("equippedMarkId") REFERENCES "Mark" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_User" ("attendanceStreak", "createdAt", "exp", "id", "isDealerVerified", "lastAttendanceDate", "level", "nickname", "points", "profileMarkImageUrl", "updatedAt") SELECT "attendanceStreak", "createdAt", "exp", "id", "isDealerVerified", "lastAttendanceDate", "level", "nickname", "points", "profileMarkImageUrl", "updatedAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_nickname_key" ON "User"("nickname");
CREATE INDEX "User_level_idx" ON "User"("level");
CREATE INDEX "User_isDealerVerified_idx" ON "User"("isDealerVerified");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "PostVote_postId_userId_key" ON "PostVote"("postId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Report_postId_reporterId_key" ON "Report"("postId", "reporterId");

-- CreateIndex
CREATE UNIQUE INDEX "Mark_slug_key" ON "Mark"("slug");
