-- 팟 계산 칭호 설정(켜기/끄기 · 이름 · 기준 난이도 · 기간 · 제외 회원) JSON
ALTER TABLE "SiteSetting" ADD COLUMN IF NOT EXISTS "potTitleJson" TEXT;
