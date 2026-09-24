-- AlterTable
ALTER TABLE "User" ADD COLUMN "kakaoId" TEXT;
ALTER TABLE "User" ADD COLUMN "resetCodeHash" TEXT;
ALTER TABLE "User" ADD COLUMN "resetCodeExpires" DATETIME;
CREATE UNIQUE INDEX "User_kakaoId_key" ON "User"("kakaoId");
