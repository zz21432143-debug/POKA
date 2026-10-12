CREATE TABLE IF NOT EXISTS "DailyVisit" (
  "day" TEXT NOT NULL,
  "visitor" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DailyVisit_pkey" PRIMARY KEY ("day", "visitor")
);
CREATE INDEX IF NOT EXISTS "DailyVisit_day_idx" ON "DailyVisit"("day");
