-- 요괴 마을: 여러 마리 키우기. 요괴마다 경험치 · 포만감 · 친밀도 · 쓰다듬기 시각
CREATE TABLE IF NOT EXISTS "YokaiOwned" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "species" TEXT NOT NULL,
  "exp" INTEGER NOT NULL DEFAULT 0,
  "fullness" INTEGER NOT NULL DEFAULT 60,
  "fullnessAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "affection" INTEGER NOT NULL DEFAULT 0,
  "petDay" TEXT NOT NULL DEFAULT '',
  "pettedToday" INTEGER NOT NULL DEFAULT 0,
  "pettedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "YokaiOwned_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "YokaiOwned_userId_species_key" ON "YokaiOwned"("userId", "species");
-- 회원 단위: 키우는 중인 요괴 · 대표 요괴 · 등장 알림을 본 요괴
ALTER TABLE "YokaiPet" ADD COLUMN IF NOT EXISTS "activeSpecies" TEXT NOT NULL DEFAULT '';
ALTER TABLE "YokaiPet" ADD COLUMN IF NOT EXISTS "mainSpecies" TEXT NOT NULL DEFAULT '';
ALTER TABLE "YokaiPet" ADD COLUMN IF NOT EXISTS "seenJson" TEXT NOT NULL DEFAULT '[]';
-- 예전(한 마리) 기록 옮기기(이미 있으면 그대로)
INSERT INTO "YokaiOwned" ("id", "userId", "species", "exp", "fullness", "fullnessAt", "affection", "createdAt")
SELECT 'yo_' || "id", "userId", "species", "exp", "fullness", "fullnessAt", "affection", "createdAt" FROM "YokaiPet"
ON CONFLICT DO NOTHING;
UPDATE "YokaiPet" SET "activeSpecies" = "species" WHERE "activeSpecies" = '';
UPDATE "YokaiPet" SET "mainSpecies" = "species" WHERE "mainSpecies" = '';
UPDATE "YokaiPet" SET "seenJson" = "dexJson" WHERE "seenJson" = '[]';
