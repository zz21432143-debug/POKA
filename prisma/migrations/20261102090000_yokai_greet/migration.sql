-- 요괴 마을 하루 첫 방문 인사(친밀도 보너스) 날짜
ALTER TABLE "YokaiPet" ADD COLUMN IF NOT EXISTS "greetDay" TEXT NOT NULL DEFAULT '';
