-- 개인 구직(SEEKING)은 운영 종료 · 메뉴에도 없어 옛 글 정리(여러 번 실행해도 같은 결과)
DELETE FROM "Post" WHERE "boardType" = 'JOBS' AND "jobKind" = 'SEEKING';
