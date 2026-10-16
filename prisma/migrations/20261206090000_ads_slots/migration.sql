-- 광고 단위 ID를 관리자 화면에서 넣기(환경변수 없이) — 여러 번 실행해도 같은 결과
ALTER TABLE "SiteSetting" ADD COLUMN IF NOT EXISTS "adsSlotsJson" TEXT;
