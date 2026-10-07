-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "BoardType" AS ENUM ('FREE', 'RULE_QA', 'SKETCH', 'HAND_REVIEW', 'ANONYMOUS_REVIEW', 'JOBS', 'PROMO', 'EVENT_POSTER', 'OFFICIAL_POSTER', 'TALENT', 'PICKUP', 'SCHEDULE');

-- CreateEnum
CREATE TYPE "JobKind" AS ENUM ('FIXED', 'APPLY', 'TEAM', 'URGENT', 'SEEKING');

-- CreateEnum
CREATE TYPE "MemberKind" AS ENUM ('COMPANY', 'INDIVIDUAL');

-- CreateEnum
CREATE TYPE "MarkCategory" AS ENUM ('TEAM', 'LEVEL', 'SPECIAL');

-- CreateEnum
CREATE TYPE "CosmeticKind" AS ENUM ('FRAME', 'EFFECT');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "nickname" TEXT NOT NULL,
    "passwordHash" TEXT,
    "kakaoId" TEXT,
    "resetCodeHash" TEXT,
    "resetCodeExpires" TIMESTAMP(3),
    "profileMarkImageUrl" TEXT,
    "equippedMarkId" TEXT,
    "equippedFrameId" TEXT,
    "equippedEffectId" TEXT,
    "level" INTEGER NOT NULL DEFAULT 1,
    "exp" INTEGER NOT NULL DEFAULT 0,
    "points" INTEGER NOT NULL DEFAULT 0,
    "isDealerVerified" BOOLEAN NOT NULL DEFAULT false,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "memberKind" "MemberKind" NOT NULL DEFAULT 'INDIVIDUAL',
    "lastPostAt" TIMESTAMP(3),
    "lastCommentAt" TIMESTAMP(3),
    "lastAttendanceDate" TEXT,
    "attendanceStreak" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Post" (
    "id" TEXT NOT NULL,
    "boardType" "BoardType" NOT NULL,
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
    "jobKind" "JobKind",
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
    "jobApplyValue" TEXT,
    "jobPositions" TEXT,
    "jobWorkType" TEXT,
    "jobAlwaysOpen" BOOLEAN NOT NULL DEFAULT false,
    "eventDate" TEXT,
    "eventEndDate" TEXT,
    "eventPrize" TEXT,
    "eventLink" TEXT,
    "storeVerified" BOOLEAN NOT NULL DEFAULT false,
    "isPaid" BOOLEAN NOT NULL DEFAULT false,
    "bannerSlot" INTEGER,
    "bannerImageUrl" TEXT,
    "promoLocation" TEXT,
    "promoTag" TEXT,
    "jobFilled" BOOLEAN NOT NULL DEFAULT false,
    "hidden" BOOLEAN NOT NULL DEFAULT false,
    "ratingManner" INTEGER,
    "ratingService" INTEGER,
    "ratingFacility" INTEGER,
    "ratingAtmosphere" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Post_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Comment" (
    "id" TEXT NOT NULL,
    "postId" TEXT,
    "authorId" TEXT,
    "content" TEXT NOT NULL,
    "isAttendanceCheck" BOOLEAN NOT NULL DEFAULT false,
    "upvoteCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommentVote" (
    "id" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommentVote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TickerEvent" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "href" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TickerEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyAttendance" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyAttendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HandPollVote" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "choice" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HandPollVote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostVote" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PostVote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "reporterIp" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "userId" TEXT,
    "ip" TEXT NOT NULL,
    "postId" TEXT,
    "detail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WriteThrottle" (
    "key" TEXT NOT NULL,
    "lastAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WriteThrottle_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "BannerSlot" (
    "slot" INTEGER NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'AUTO',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "postId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BannerSlot_pkey" PRIMARY KEY ("slot")
);

-- CreateTable
CREATE TABLE "SponsorUnit" (
    "placement" TEXT NOT NULL,
    "imageUrl" TEXT,
    "href" TEXT NOT NULL DEFAULT '/advertise',
    "title" TEXT NOT NULL DEFAULT '',
    "advertiser" TEXT NOT NULL DEFAULT '',
    "mark" TEXT NOT NULL DEFAULT '제휴',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SponsorUnit_pkey" PRIMARY KEY ("placement")
);

-- CreateTable
CREATE TABLE "Mark" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "pricePoints" INTEGER NOT NULL,
    "minLevel" INTEGER NOT NULL DEFAULT 1,
    "category" "MarkCategory" NOT NULL DEFAULT 'SPECIAL',

    CONSTRAINT "Mark_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserMark" (
    "userId" TEXT NOT NULL,
    "markId" TEXT NOT NULL,
    "purchasedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserMark_pkey" PRIMARY KEY ("userId","markId")
);

-- CreateTable
CREATE TABLE "ProfileCosmetic" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "CosmeticKind" NOT NULL,
    "imageUrl" TEXT,
    "cssClass" TEXT,
    "pricePoints" INTEGER NOT NULL,
    "minLevel" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "ProfileCosmetic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserCosmetic" (
    "userId" TEXT NOT NULL,
    "cosmeticId" TEXT NOT NULL,
    "purchasedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserCosmetic_pkey" PRIMARY KEY ("userId","cosmeticId")
);

-- CreateTable
CREATE TABLE "DealerDrillRun" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "correct" INTEGER NOT NULL,
    "total" INTEGER NOT NULL,
    "durationMs" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DealerDrillRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LevelExp" (
    "level" INTEGER NOT NULL,
    "requiredExp" INTEGER NOT NULL,
    "markPurchasePoints" INTEGER NOT NULL,

    CONSTRAINT "LevelExp_pkey" PRIMARY KEY ("level")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_nickname_key" ON "User"("nickname");

-- CreateIndex
CREATE UNIQUE INDEX "User_kakaoId_key" ON "User"("kakaoId");

-- CreateIndex
CREATE INDEX "User_level_idx" ON "User"("level");

-- CreateIndex
CREATE INDEX "User_isDealerVerified_idx" ON "User"("isDealerVerified");

-- CreateIndex
CREATE INDEX "User_isAdmin_idx" ON "User"("isAdmin");

-- CreateIndex
CREATE UNIQUE INDEX "Post_attendanceDate_key" ON "Post"("attendanceDate");

-- CreateIndex
CREATE UNIQUE INDEX "Post_bannerSlot_key" ON "Post"("bannerSlot");

-- CreateIndex
CREATE INDEX "Post_boardType_createdAt_idx" ON "Post"("boardType", "createdAt");

-- CreateIndex
CREATE INDEX "Post_authorId_idx" ON "Post"("authorId");

-- CreateIndex
CREATE INDEX "Post_isAttendanceThread_attendanceDate_idx" ON "Post"("isAttendanceThread", "attendanceDate");

-- CreateIndex
CREATE INDEX "Post_jobKind_isPaid_idx" ON "Post"("jobKind", "isPaid");

-- CreateIndex
CREATE INDEX "Post_eventDate_idx" ON "Post"("eventDate");

-- CreateIndex
CREATE INDEX "Post_jobWorkType_idx" ON "Post"("jobWorkType");

-- CreateIndex
CREATE INDEX "Post_hidden_boardType_createdAt_idx" ON "Post"("hidden", "boardType", "createdAt");

-- CreateIndex
CREATE INDEX "Post_authorIp_createdAt_idx" ON "Post"("authorIp", "createdAt");

-- CreateIndex
CREATE INDEX "Post_upvoteCount_viewCount_idx" ON "Post"("upvoteCount", "viewCount");

-- CreateIndex
CREATE INDEX "Comment_postId_idx" ON "Comment"("postId");

-- CreateIndex
CREATE INDEX "Comment_postId_upvoteCount_idx" ON "Comment"("postId", "upvoteCount");

-- CreateIndex
CREATE INDEX "Comment_authorId_isAttendanceCheck_createdAt_idx" ON "Comment"("authorId", "isAttendanceCheck", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CommentVote_commentId_userId_key" ON "CommentVote"("commentId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "TickerEvent_kind_key" ON "TickerEvent"("kind");

-- CreateIndex
CREATE INDEX "TickerEvent_createdAt_idx" ON "TickerEvent"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "DailyAttendance_commentId_key" ON "DailyAttendance"("commentId");

-- CreateIndex
CREATE INDEX "DailyAttendance_date_idx" ON "DailyAttendance"("date");

-- CreateIndex
CREATE UNIQUE INDEX "DailyAttendance_userId_date_key" ON "DailyAttendance"("userId", "date");

-- CreateIndex
CREATE INDEX "HandPollVote_postId_choice_idx" ON "HandPollVote"("postId", "choice");

-- CreateIndex
CREATE UNIQUE INDEX "HandPollVote_postId_userId_key" ON "HandPollVote"("postId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "PostVote_postId_userId_key" ON "PostVote"("postId", "userId");

-- CreateIndex
CREATE INDEX "Report_status_createdAt_idx" ON "Report"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Report_postId_reporterId_key" ON "Report"("postId", "reporterId");

-- CreateIndex
CREATE INDEX "AuditLog_kind_createdAt_idx" ON "AuditLog"("kind", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_ip_createdAt_idx" ON "AuditLog"("ip", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_userId_createdAt_idx" ON "AuditLog"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Mark_slug_key" ON "Mark"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "ProfileCosmetic_slug_key" ON "ProfileCosmetic"("slug");

-- CreateIndex
CREATE INDEX "ProfileCosmetic_kind_idx" ON "ProfileCosmetic"("kind");

-- CreateIndex
CREATE INDEX "DealerDrillRun_kind_correct_durationMs_idx" ON "DealerDrillRun"("kind", "correct", "durationMs");

-- CreateIndex
CREATE INDEX "DealerDrillRun_userId_createdAt_idx" ON "DealerDrillRun"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_equippedMarkId_fkey" FOREIGN KEY ("equippedMarkId") REFERENCES "Mark"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_equippedFrameId_fkey" FOREIGN KEY ("equippedFrameId") REFERENCES "ProfileCosmetic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_equippedEffectId_fkey" FOREIGN KEY ("equippedEffectId") REFERENCES "ProfileCosmetic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommentVote" ADD CONSTRAINT "CommentVote_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommentVote" ADD CONSTRAINT "CommentVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyAttendance" ADD CONSTRAINT "DailyAttendance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyAttendance" ADD CONSTRAINT "DailyAttendance_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyAttendance" ADD CONSTRAINT "DailyAttendance_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HandPollVote" ADD CONSTRAINT "HandPollVote_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HandPollVote" ADD CONSTRAINT "HandPollVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostVote" ADD CONSTRAINT "PostVote_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostVote" ADD CONSTRAINT "PostVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BannerSlot" ADD CONSTRAINT "BannerSlot_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserMark" ADD CONSTRAINT "UserMark_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserMark" ADD CONSTRAINT "UserMark_markId_fkey" FOREIGN KEY ("markId") REFERENCES "Mark"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCosmetic" ADD CONSTRAINT "UserCosmetic_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCosmetic" ADD CONSTRAINT "UserCosmetic_cosmeticId_fkey" FOREIGN KEY ("cosmeticId") REFERENCES "ProfileCosmetic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealerDrillRun" ADD CONSTRAINT "DealerDrillRun_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

