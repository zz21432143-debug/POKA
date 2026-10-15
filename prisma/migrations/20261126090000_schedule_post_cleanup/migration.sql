-- 대회 일정 공지: 상금 표현 빼기(데이터만 · 여러 번 실행해도 같은 결과)
UPDATE "Post" SET "content" = replace("content", '이번 주 열리는 홀덤 대회를 총상금이 큰 순서대로 정리했습니다.', '이번 주 열리는 홀덤 대회 일정을 정리했습니다. 딜러 · 플레이어 모두 일정 확인용으로 보세요.')
WHERE "boardType" = 'NOTICE' AND "content" LIKE '%총상금이 큰 순서대로%';
UPDATE "Post" SET "content" = replace("content", '이번 주말 나갈 대회를 고르는 분들을 위해 상금 순으로 모았습니다.', '이번 주말 열리는 대회를 일정 · 장소와 함께 모았습니다.')
WHERE "boardType" = 'NOTICE' AND "content" LIKE '%상금 순으로 모았습니다%';
UPDATE "Post" SET "content" = replace(replace("content", '🏆 이번 주 대회 (상금 순)', '🗓 이번 주 대회'), '🏆 주말 대회 (상금 순)', '🗓 주말 대회')
WHERE "boardType" = 'NOTICE' AND "content" LIKE '%(상금 순)%';
UPDATE "Post" SET "content" = regexp_replace("content", ' · 총상금 [^\n]*', '', 'g')
WHERE "boardType" = 'NOTICE' AND "content" LIKE '% · 총상금 %';
UPDATE "Post" SET "content" = replace("content", ' · (없음)', '')
WHERE "boardType" = 'NOTICE' AND "content" LIKE '% · (없음)%';
