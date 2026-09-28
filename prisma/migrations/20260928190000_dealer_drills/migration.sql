-- CreateTable
CREATE TABLE "DealerDrillRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "correct" INTEGER NOT NULL,
    "total" INTEGER NOT NULL,
    "durationMs" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DealerDrillRun_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "DealerDrillRun_kind_correct_durationMs_idx" ON "DealerDrillRun"("kind", "correct", "durationMs");

-- CreateIndex
CREATE INDEX "DealerDrillRun_userId_createdAt_idx" ON "DealerDrillRun"("userId", "createdAt");
