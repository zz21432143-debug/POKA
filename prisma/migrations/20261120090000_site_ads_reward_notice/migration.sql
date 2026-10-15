-- 사이트 설정: 광고 구좌 끄기 목록 · 게임 승리 보상(관리자 조정) — 추가만
ALTER TABLE "SiteSetting" ADD COLUMN IF NOT EXISTS "adsOffJson" TEXT;
ALTER TABLE "SiteSetting" ADD COLUMN IF NOT EXISTS "gameRewardJson" TEXT;

-- 공지: 요괴 게임방 리뉴얼 안내(한 번만 · 이미 있으면 그대로)
INSERT INTO "Post" ("id", "boardType", "authorId", "title", "content", "pinnedAt", "createdAt", "updatedAt", "bumpedAt")
SELECT
  'notice_games_renewal_2026',
  'NOTICE',
  (SELECT "id" FROM "User" WHERE "isMaster" = true ORDER BY "createdAt" ASC LIMIT 1),
  '[업데이트] POKA 요괴 게임방(윷놀이·오목) 전면 리뉴얼 및 PC/모바일 UI/UX 대개편 안내',
  E'안녕하세요, POKA 플레이어 여러분!\nPOKA 요괴 게임방이 PC와 모바일 환경 모두에서 한층 더 신나고 쾌적하게 대규모 전면 개편되었습니다.\n\n1. 🎲 요괴 윷놀이 대폭 강화 (스피드 & 손맛 극대화)\n- PC 스페이스바(Spacebar) 던지기 & 모바일 대형 터치 버튼 추가!\n- 땅 클릭/터치 시 액션 취소 & 클릭 투 무브 점프 이동 지원.\n- 상대 말을 잡을 때 화려한 요괴 전용 도발 컷인 등판!\n- 신나고 경쾌한 8비트 레트로 윷놀이 전용 BGM 적용.\n\n2. ⚪⚫ 요괴 오목 가시성 & 모바일 터치 최적화\n- 선공(흑)/후공(백) 테두리 명확 구별로 동일 요괴 대결 가시성 완료.\n- 모바일 돋보기 터치 가이드 적용 및 오목판 크기 대폭 확대.\n\n3. 📱 PC / 모바일 반응형 아케이드 대시보드 리뉴얼\n- 스크롤 없는 2단 대시보드(PC) 및 모바일 스택 레이아웃 개편.\n- 사이드바 자동 접힘 및 대국 진입 시 완전 몰입(Focus) 모드 적용.\n- 승자연전(대기열) 자동 교체 & 관전 퀵 이모티콘 추가.\n\n4. 🎖️ 칭호 시스템 & 기권 기능\n- 이번 달 오목 · 윷놀이 1위에게 요괴 전용 칭호 배지 표기.\n- 즉시 승패 정산이 가능한 ''기권(서렌더)'' 기능 적용.\n\n지금 바로 PC와 모바일 어디서나 더 넓어지고 신나진 POKA 요괴 게임방을 즐겨보세요!',
  (now() AT TIME ZONE 'utc'),
  (now() AT TIME ZONE 'utc'),
  (now() AT TIME ZONE 'utc'),
  (now() AT TIME ZONE 'utc')
WHERE EXISTS (SELECT 1 FROM "User" WHERE "isMaster" = true)
ON CONFLICT ("id") DO NOTHING;
