CREATE TABLE IF NOT EXISTS "UploadChunk" (
  "fileId" TEXT NOT NULL,
  "idx" INTEGER NOT NULL,
  "data" BYTEA NOT NULL,
  CONSTRAINT "UploadChunk_pkey" PRIMARY KEY ("fileId", "idx")
);
