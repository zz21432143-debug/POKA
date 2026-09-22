-- CreateTable
CREATE TABLE "SponsorUnit" (
    "placement" TEXT NOT NULL PRIMARY KEY,
    "imageUrl" TEXT,
    "href" TEXT NOT NULL DEFAULT '/advertise',
    "title" TEXT NOT NULL DEFAULT '',
    "advertiser" TEXT NOT NULL DEFAULT '',
    "mark" TEXT NOT NULL DEFAULT '제휴',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" DATETIME NOT NULL
);
