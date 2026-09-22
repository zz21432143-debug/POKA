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
    "jobCompanyName" TEXT,
    "jobPayType" TEXT,
    "jobPayAmount" TEXT,
    "jobWorkHours" TEXT,
    "jobExperience" TEXT,
    "jobContact" TEXT,
    "jobWorkDate" TEXT,
    "jobDateFlexible" BOOLEAN NOT NULL DEFAULT false,
    "jobGuaranteedHours" TEXT,
    "jobOvertime" TEXT,
    "jobTravelPay" BOOLEAN NOT NULL DEFAULT false,
    "jobSnacks" BOOLEAN NOT NULL DEFAULT false,
    "jobDressCode" TEXT,
    "jobApplyMethod" TEXT,
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
INSERT INTO "new_Post" ("attendanceDate", "authorId", "authorIp", "bannerImageUrl", "bannerSlot", "boardType", "content", "createdAt", "downvoteCount", "handReviewJson", "hidden", "id", "isAttendanceThread", "isPaid", "jobBenefits", "jobFilled", "jobHeadcount", "jobKind", "jobLocation", "jobPay", "jobSchedule", "jobTeamGoal", "promoLocation", "promoTag", "title", "updatedAt", "upvoteCount", "viewCount") SELECT "attendanceDate", "authorId", "authorIp", "bannerImageUrl", "bannerSlot", "boardType", "content", "createdAt", "downvoteCount", "handReviewJson", "hidden", "id", "isAttendanceThread", "isPaid", "jobBenefits", "jobFilled", "jobHeadcount", "jobKind", "jobLocation", "jobPay", "jobSchedule", "jobTeamGoal", "promoLocation", "promoTag", "title", "updatedAt", "upvoteCount", "viewCount" FROM "Post";
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
