-- 광고 자리별 하루 채움 · 빈칸 수(관리 화면 「실제 노출」) — 여러 번 실행해도 같은 결과
CREATE TABLE IF NOT EXISTS "AdFillStat" (
  "day" TEXT NOT NULL,
  "placement" TEXT NOT NULL,
  "filled" INTEGER NOT NULL DEFAULT 0,
  "unfilled" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "AdFillStat_pkey" PRIMARY KEY ("day", "placement")
);
