-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kind" TEXT NOT NULL,
    "userId" TEXT,
    "ip" TEXT NOT NULL,
    "postId" TEXT,
    "detail" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "WriteThrottle" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "lastAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "BannerSlot" (
    "slot" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "mode" TEXT NOT NULL DEFAULT 'AUTO',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "postId" TEXT,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BannerSlot_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post" ("id") ON DELETE SET NULL ON UPDATE CASCADE
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
    "hidden" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Post_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Post" ("attendanceDate", "authorId", "authorIp", "bannerImageUrl", "bannerSlot", "boardType", "content", "createdAt", "downvoteCount", "handReviewJson", "id", "isAttendanceThread", "isPaid", "jobHeadcount", "jobKind", "jobLocation", "jobPay", "jobSchedule", "title", "updatedAt", "upvoteCount") SELECT "attendanceDate", "authorId", "authorIp", "bannerImageUrl", "bannerSlot", "boardType", "content", "createdAt", "downvoteCount", "handReviewJson", "id", "isAttendanceThread", "isPaid", "jobHeadcount", "jobKind", "jobLocation", "jobPay", "jobSchedule", "title", "updatedAt", "upvoteCount" FROM "Post";
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
CREATE TABLE "new_Report" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "postId" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "reporterIp" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Report_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Report_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Report" ("createdAt", "id", "postId", "reason", "reporterId") SELECT "createdAt", "id", "postId", "reason", "reporterId" FROM "Report";
DROP TABLE "Report";
ALTER TABLE "new_Report" RENAME TO "Report";
CREATE INDEX "Report_status_createdAt_idx" ON "Report"("status", "createdAt");
CREATE UNIQUE INDEX "Report_postId_reporterId_key" ON "Report"("postId", "reporterId");
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nickname" TEXT NOT NULL,
    "profileMarkImageUrl" TEXT,
    "equippedMarkId" TEXT,
    "level" INTEGER NOT NULL DEFAULT 1,
    "exp" INTEGER NOT NULL DEFAULT 0,
    "points" INTEGER NOT NULL DEFAULT 0,
    "isDealerVerified" BOOLEAN NOT NULL DEFAULT false,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "lastPostAt" DATETIME,
    "lastCommentAt" DATETIME,
    "lastAttendanceDate" TEXT,
    "attendanceStreak" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "User_equippedMarkId_fkey" FOREIGN KEY ("equippedMarkId") REFERENCES "Mark" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_User" ("attendanceStreak", "createdAt", "equippedMarkId", "exp", "id", "isDealerVerified", "lastAttendanceDate", "level", "nickname", "points", "profileMarkImageUrl", "updatedAt") SELECT "attendanceStreak", "createdAt", "equippedMarkId", "exp", "id", "isDealerVerified", "lastAttendanceDate", "level", "nickname", "points", "profileMarkImageUrl", "updatedAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_nickname_key" ON "User"("nickname");
CREATE INDEX "User_level_idx" ON "User"("level");
CREATE INDEX "User_isDealerVerified_idx" ON "User"("isDealerVerified");
CREATE INDEX "User_isAdmin_idx" ON "User"("isAdmin");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "AuditLog_kind_createdAt_idx" ON "AuditLog"("kind", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_ip_createdAt_idx" ON "AuditLog"("ip", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_userId_createdAt_idx" ON "AuditLog"("userId", "createdAt");
