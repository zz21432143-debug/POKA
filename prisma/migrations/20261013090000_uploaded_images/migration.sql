CREATE TABLE IF NOT EXISTS "UploadedImage" (
  "id" TEXT NOT NULL,
  "mime" TEXT NOT NULL,
  "data" BYTEA NOT NULL,
  "size" INTEGER NOT NULL,
  "uploaderId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UploadedImage_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "UploadedImage_createdAt_idx" ON "UploadedImage"("createdAt");
