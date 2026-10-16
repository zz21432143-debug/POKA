-- 요괴 게임방 → 요괴 오락실(공지 글 제목 · 본문, 데이터만 · 여러 번 실행해도 같은 결과)
UPDATE "Post" SET "title" = replace(replace("title", '요괴 게임방', '요괴 오락실'), '게임방', '오락실')
WHERE "boardType" = 'NOTICE' AND "title" LIKE '%게임방%';
UPDATE "Post" SET "content" = replace(replace("content", '요괴 게임방', '요괴 오락실'), '게임방', '오락실')
WHERE "boardType" = 'NOTICE' AND "content" LIKE '%게임방%';
