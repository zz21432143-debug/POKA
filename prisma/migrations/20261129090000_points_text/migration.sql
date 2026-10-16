-- 포인트 1.3배 · 미션 5개: 이미 올린 공지 글의 예전 숫자 바꾸기(데이터만 · 여러 번 실행해도 같은 결과)
UPDATE "Post" SET "content" = replace("content", '• 10 친구(20P) · 30 다정한 친구(50P) · 50 단짝(100P) · 70 찐친(150P) · 100 영혼의 단짝(300P)', '• 10 친구(26P) · 30 다정한 친구(65P) · 50 단짝(130P) · 70 찐친(195P) · 100 영혼의 단짝(390P)')
WHERE "content" LIKE '%10 친구(20P)%';
UPDATE "Post" SET "content" = replace("content", '• 출석 · 오늘의 퀴즈 정답 · 글이나 댓글 1개 · 홀덤 공부 도구, 네 가지를 다 하면 +100P · EXP +30', '• 출석 · 오늘의 퀴즈 정답 · 글 1개 · 댓글 1개 · 홀덤 공부 도구, 다섯 가지를 다 하면 +130P · EXP +30')
WHERE "content" LIKE '%네 가지를 다 하면 +100P%';
UPDATE "Post" SET "content" = replace("content", '• 한 주에 5일 미션을 달성하면 +300P · EXP +100을 더 드려요.', '• 한 주에 5일 미션을 달성하면 +390P · EXP +100을 더 드려요.')
WHERE "content" LIKE '%+300P · EXP +100을 더 드려요%';
UPDATE "Post" SET "content" = replace("content", '• +30P · EXP 20 · 대표 요괴 친밀도 +3 (하루 5판 · 같은 상대 2판까지)', '• +39P · EXP 20 · 대표 요괴 친밀도 +3 (하루 5판 · 같은 상대 2판까지)')
WHERE "content" LIKE '%• +30P · EXP 20 · 대표 요괴 친밀도%';
