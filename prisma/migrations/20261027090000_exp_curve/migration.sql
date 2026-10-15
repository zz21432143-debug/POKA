-- 레벨 곡선 변경(30레벨부터 한 레벨에 더 많은 경험치 · src/lib/levels.ts LEVEL_BANDS)
-- 이미 쌓은 레벨은 그대로 두고, 지금 레벨 안에서의 진행 비율도 그대로 새 곡선으로 옮김. 한 번만 실행.
CREATE TABLE IF NOT EXISTS "AppliedOnce" ("key" TEXT NOT NULL PRIMARY KEY, "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM "AppliedOnce" WHERE "key" = 'exp-curve-2026-10') THEN
    UPDATE "User" u SET "exp" = (
      CASE
        WHEN u."level" < 30 THEN (u."level" - 1) * 100
        WHEN u."level" < 100 THEN 2900 + (u."level" - 30) * 150
        WHEN u."level" < 150 THEN 13400 + (u."level" - 100) * 250
        WHEN u."level" < 200 THEN 25900 + (u."level" - 150) * 350
        ELSE 43400 + (LEAST(u."level", 250) - 200) * 450
      END
    ) + (
      LEAST(GREATEST(u."exp" - (u."level" - 1) * 100, 0), 99) *
      CASE
        WHEN u."level" < 30 THEN 100
        WHEN u."level" < 100 THEN 150
        WHEN u."level" < 150 THEN 250
        WHEN u."level" < 200 THEN 350
        ELSE 450
      END
    ) / 100
    WHERE u."level" >= 30;
    INSERT INTO "AppliedOnce" ("key") VALUES ('exp-curve-2026-10');
  END IF;
END $$;
