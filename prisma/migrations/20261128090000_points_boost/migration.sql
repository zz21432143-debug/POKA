-- 포인트 1.3배: 관리자가 저장해 둔 게임 승리 보상이 예전 기본값(30P)이면 39P로(여러 번 실행해도 같은 결과)
UPDATE "SiteSetting"
SET "gameRewardJson" = ("gameRewardJson"::jsonb || '{"points":39}'::jsonb)::text
WHERE "gameRewardJson" IS NOT NULL
  AND "gameRewardJson" LIKE '{%'
  AND ("gameRewardJson"::jsonb ->> 'points') = '30';
