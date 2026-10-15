-- 요괴 마을 배경(포인트로 사기): 가진 배경 · 쓰는 배경
ALTER TABLE "YokaiPet" ADD COLUMN IF NOT EXISTS "bgOwnedJson" TEXT NOT NULL DEFAULT '["default"]';
ALTER TABLE "YokaiPet" ADD COLUMN IF NOT EXISTS "bgActive" TEXT NOT NULL DEFAULT 'default';
