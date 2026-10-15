-- 요괴 마을 알림(배고플 때 저녁 한 번) 받기
ALTER TABLE "PushSubscription" ADD COLUMN IF NOT EXISTS "yokaiAlerts" BOOLEAN NOT NULL DEFAULT false;
