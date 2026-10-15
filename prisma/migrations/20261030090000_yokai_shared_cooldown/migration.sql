-- 요괴 마을: 돌보기는 대표 요괴만 · 쿨타임은 회원 단위로 함께(밥 · 쓰다듬기 · 샤워) · 친밀도 보상
ALTER TABLE "YokaiPet" ADD COLUMN IF NOT EXISTS "fedAt" TIMESTAMP(3);
ALTER TABLE "YokaiPet" ADD COLUMN IF NOT EXISTS "petDay" TEXT NOT NULL DEFAULT '';
ALTER TABLE "YokaiPet" ADD COLUMN IF NOT EXISTS "pettedToday" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "YokaiPet" ADD COLUMN IF NOT EXISTS "pettedAt" TIMESTAMP(3);
ALTER TABLE "YokaiPet" ADD COLUMN IF NOT EXISTS "showerAt" TIMESTAMP(3);
ALTER TABLE "YokaiOwned" ADD COLUMN IF NOT EXISTS "bondReward" INTEGER NOT NULL DEFAULT 0;
-- 키우는 요괴 = 대표 요괴
UPDATE "YokaiPet" SET "mainSpecies" = "activeSpecies" WHERE "mainSpecies" = '' AND "activeSpecies" <> '';
UPDATE "YokaiPet" SET "activeSpecies" = "mainSpecies" WHERE "mainSpecies" <> '' AND "activeSpecies" <> "mainSpecies";
