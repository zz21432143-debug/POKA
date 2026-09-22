-- AlterTable
ALTER TABLE "Post" ADD COLUMN "ratingAtmosphere" INTEGER;
ALTER TABLE "Post" ADD COLUMN "ratingFacility" INTEGER;
ALTER TABLE "Post" ADD COLUMN "ratingManner" INTEGER;
ALTER TABLE "Post" ADD COLUMN "ratingService" INTEGER;

-- CreateTable
CREATE TABLE "HandPollVote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "choice" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "HandPollVote_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "HandPollVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "HandPollVote_postId_choice_idx" ON "HandPollVote"("postId", "choice");

-- CreateIndex
CREATE UNIQUE INDEX "HandPollVote_postId_userId_key" ON "HandPollVote"("postId", "userId");
