-- 오늘의 퀴즈 알림(매일 아침) 받기
ALTER TABLE "PushSubscription" ADD COLUMN IF NOT EXISTS "quizAlerts" BOOLEAN NOT NULL DEFAULT false;
