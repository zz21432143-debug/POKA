-- 애드센스 심사 정리(데이터만 · 여러 번 실행해도 같은 결과)
-- 1) 대회 글 제목: 상금을 앞세운 표현 → 일정
UPDATE "Post" SET "title" = replace("title", '(상금 순)', '(날짜 순)') WHERE "title" LIKE '%(상금 순)%';
UPDATE "Post" SET "title" = replace("title", '(상금·장소 비교)', '(일정·장소 비교)') WHERE "title" LIKE '%(상금·장소 비교)%';
-- 2) 이미 올라온 성적 은어 글은 숨김(관리자는 계속 볼 수 있음 · 이 날짜 전 글만 · 배포 때마다 다시 확인)
UPDATE "Post" SET "hidden" = true
WHERE "hidden" = false
  AND "createdAt" < TIMESTAMP '2026-10-17 00:00:00'
  AND "boardType" IN ('FREE', 'RULE_QA', 'SUGGESTION')
  AND ("content" ~ '(쥬지|쮸지|보지털|보짓물|자지털|딸딸이|질싸)' OR "title" ~ '(쥬지|쮸지|보지털|보짓물|자지털|딸딸이|질싸)');
