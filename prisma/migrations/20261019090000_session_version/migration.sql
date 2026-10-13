-- 로그인 쿠키 버전(모든 기기 로그아웃 · 탈퇴 시 올림)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "sessionVersion" INTEGER NOT NULL DEFAULT 0;
