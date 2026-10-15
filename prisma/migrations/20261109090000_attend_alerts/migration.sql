-- 출석 1등 알림(밤 12시, 원하는 기기만)
ALTER TABLE "PushSubscription" ADD COLUMN IF NOT EXISTS "attendAlerts" BOOLEAN NOT NULL DEFAULT false;
