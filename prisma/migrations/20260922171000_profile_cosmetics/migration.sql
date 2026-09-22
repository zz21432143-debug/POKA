-- CreateTable
CREATE TABLE "ProfileCosmetic" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "imageUrl" TEXT,
    "cssClass" TEXT,
    "pricePoints" INTEGER NOT NULL,
    "minLevel" INTEGER NOT NULL DEFAULT 1
);

-- CreateTable
CREATE TABLE "UserCosmetic" (
    "userId" TEXT NOT NULL,
    "cosmeticId" TEXT NOT NULL,
    "purchasedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY ("userId", "cosmeticId"),
    CONSTRAINT "UserCosmetic_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UserCosmetic_cosmeticId_fkey" FOREIGN KEY ("cosmeticId") REFERENCES "ProfileCosmetic" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- AlterTable
ALTER TABLE "User" ADD COLUMN "equippedFrameId" TEXT;
ALTER TABLE "User" ADD COLUMN "equippedEffectId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "ProfileCosmetic_slug_key" ON "ProfileCosmetic"("slug");
CREATE INDEX "ProfileCosmetic_kind_idx" ON "ProfileCosmetic"("kind");
