-- 요괴 마을 공개: 찾아오는 조건 검사 시각(홈 알림이 너무 자주 검사하지 않게) · 간식(포인트로 밥 한 번 더)
ALTER TABLE "YokaiPet" ADD COLUMN IF NOT EXISTS "arrivalCheckedAt" TIMESTAMP(3);
ALTER TABLE "YokaiPet" ADD COLUMN IF NOT EXISTS "snackDay" TEXT NOT NULL DEFAULT '';
ALTER TABLE "YokaiPet" ADD COLUMN IF NOT EXISTS "snacksToday" INTEGER NOT NULL DEFAULT 0;
