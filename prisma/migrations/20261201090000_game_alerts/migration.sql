-- 게임방 상대 찾기 알림(추가만)
ALTER TABLE "PushSubscription" ADD COLUMN IF NOT EXISTS "gameAlerts" BOOLEAN NOT NULL DEFAULT false;
