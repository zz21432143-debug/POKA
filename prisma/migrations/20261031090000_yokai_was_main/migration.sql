-- 요괴마다 처음 대표로 정할 때는 무료: 대표였던 적이 있는지
ALTER TABLE "YokaiOwned" ADD COLUMN IF NOT EXISTS "wasMain" BOOLEAN NOT NULL DEFAULT false;
UPDATE "YokaiOwned" o SET "wasMain" = true FROM "YokaiPet" p WHERE p."userId" = o."userId" AND p."mainSpecies" = o.species AND o."wasMain" = false;
