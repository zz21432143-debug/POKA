-- 공지 바꾸기: 요괴 오락실 리뉴얼 안내는 내리고(숨김 · 지우지 않음) 구인 공지를 올림.
-- 구인 공지가 이미 있으면 아무것도 안 함(관리자가 나중에 다시 켠 것을 되돌리지 않게) — 여러 번 실행해도 같은 결과
UPDATE "Post" SET "hidden" = true, "pinnedAt" = NULL
WHERE "id" = 'notice_games_renewal_2026'
  AND NOT EXISTS (SELECT 1 FROM "Post" WHERE "id" = 'notice_jobs_paste_2026');

INSERT INTO "Post" ("id", "boardType", "authorId", "title", "content", "createdAt", "updatedAt", "bumpedAt")
SELECT
  'notice_jobs_paste_2026',
  'NOTICE',
  (SELECT "id" FROM "User" WHERE "isMaster" = true ORDER BY "createdAt" ASC LIMIT 1),
  '[안내] 딜러 구인, 카톡 공고 그대로 붙여넣으면 바로 올라가요',
  E'안녕하세요, POKA입니다.\n\n딜러 구인 게시판이 카카오톡 오픈채팅처럼 바뀌었습니다. 매장에서 쓰던 카톡 공고를 그대로 복사해서 붙여넣으면 바로 올라갑니다.\n\n1. 공고 올리기\n- 지원 딜러 · 대회 딜러 · 급구/대타 · 고정 직원 · 팀 구인 어느 게시판이든 맨 아래 입력칸에 카톡 공고를 붙여넣고 보내기를 누르세요.\n- 날짜 · 시간 · 인원 · 시급 · 연락처를 자동으로 읽습니다. 지점이 여러 지역이면 지점이 가장 많은 지역으로 골라 드려요.\n\n2. 올린 뒤 관리\n- 일정이 바뀌면 내 말풍선의 「붙여넣고 갱신」을 누르면 새 내용으로 바뀌고 맨 아래로 올라갑니다(지우고 다시 올릴 필요 없음).\n- 「내 공고 관리」에서 매장 로고 올리기 · 날짜 줄 하나씩 마감 · 끌어올리기를 할 수 있어요.\n\n3. 딜러분들께\n- 「날짜별로 보기」에서 오늘 · 내일 빈자리를 한눈에 볼 수 있어요.\n- 「빈자리 알림 받기」에 가능한 날과 지역을 정해 두면, 맞는 빈자리가 올라올 때 알림이 갑니다.\n- 공고 말풍선의 「문자 지원」을 누르면 바로 문자로 지원할 수 있어요(연락처는 로그인 후).\n\n4. 매장 관리 도구(회원 무료)\n- 딜러 로테이션 · 싯드로우 · 게임 현황판 · 급여 계산기를 「매장 관리」에서 쓸 수 있어요.\n\n궁금한 점은 카카오톡 POKA1로 문의해 주세요.',
  (now() AT TIME ZONE 'utc'),
  (now() AT TIME ZONE 'utc'),
  (now() AT TIME ZONE 'utc')
WHERE EXISTS (SELECT 1 FROM "User" WHERE "isMaster" = true)
ON CONFLICT ("id") DO NOTHING;
