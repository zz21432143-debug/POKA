-- 구직 게시판이 없어져 구인글 제목 끝에 자동으로 붙던 "구인"을 뺍니다. 여러 번 실행해도 결과가 같습니다.
--   [서울] POKA홀덤 구인                 → [서울] POKA홀덤
--   [서울] POKA홀덤 지원딜러 구인 (시급 …) → [서울] POKA홀덤 지원딜러 (시급 …)
--   [서울] RABBIT 대회딜러 구인 (10/31…)  → [서울] RABBIT 대회딜러 (10/31…)
UPDATE "Post"
SET "title" = regexp_replace(regexp_replace("title", '(지원딜러|대회딜러) 구인', '\1', 'g'), ' 구인$', '')
WHERE "boardType" = 'JOBS'
  AND "jobKind" IN ('FIXED', 'APPLY', 'TOURNAMENT')
  AND ("title" ~ '(지원딜러|대회딜러) 구인' OR "title" ~ ' 구인$');
