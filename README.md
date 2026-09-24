# POKA

포커 플레이어와 딜러를 위한 홀덤 커뮤니티 웹사이트입니다.

PC와 모바일 브라우저(Android Chrome / iOS Safari)에서 같은 반응형 웹으로 접속합니다.

## 범위

1. **DB 모델** — 회원, 게시글, 댓글/출석, 레벨 경험치, 신고·감사 로그, 작성 쿨다운, 배너 구좌
2. **메인 레이아웃** — 라이트 민트 커뮤니티 홈, 상단 검색·알림, 아이콘 사이드바, 네이비 프로필 위젯
3. **핸드리뷰** — 그래픽 에디터/뷰어, Fold/Check/Call/Raise 원클릭 투표, 작성 EXP 80(최고)
4. **출석** — 매일 0시(KST) 스레드, 댓글 1일 1회, 연속 출석
5. **게시판** — 대회 일정, 공식 홍보(제휴·협찬), 커뮤니티(출석/이게 맞나요?/현장 스케치/자유/핸드리뷰/익명), 구인·구직 5종
6. **익명 게시판** — 닉네임 비공개. 매장 후기라면 매너/서비스/시설/분위기 별점 스탬프
7. **게이미피케이션** — 글/댓글/추천 수신 EXP, 인증 딜러 골드 뱃지, 레벨 보상(라이브/헌터/에이스), [마크 상점](/shop) (팀 마크 6종 2,000P, 구매·착용)

8. **5단계** — 모바일 터치 최적화, 작성 쿨다운, 신고 자동 숨김, 배너 수동/자동 관리, 프로덕션 빌드

현재 로그인은 `/login`에서 닉네임·비밀번호로 가입합니다. 글 작성은 로그인한 회원만 가능합니다. 시드된 계정(펠트딜러 등)의 로컬 비밀번호는 `poka1234` 입니다. 관리자로 로그인하면 우측 프로필에서 다른 시드 회원으로 전환할 수 있습니다.

광고: 직판 제휴(홈 3×2 B1–B6, 사이드바 S, 인피드 C, 본문 하단 A1–A3)가 있으면 그 소재가 우선입니다. A칸이 비면 구글이 채웁니다. 글 본문 위·아래와 사이드바 맨 아래에도 구글이 있습니다.

홈 홍보는 진행 중 포스터 3장만 보여 주고, 공식 홍보 게시판에는 공개 포스터만 남깁니다.

이 IA 정리를 되돌리려면 `git revert`로 해당 커밋을 되돌리면 됩니다.

트래픽 운영(홈 핸드/주간대회/인증딜러/SEO 제목)을 넣기 **직전** 복원 기점은 태그 `restore-pre-traffic-20260923` 입니다.

```bash
git switch --detach restore-pre-traffic-20260923
# 또는 해당 커밋으로 브랜치를 되돌릴 때
git reset --hard restore-pre-traffic-20260923
```

## 화면 구조

- **PC:** 상단 로고 + 홈/게시판/정보센터/커뮤니티 + 검색 + 알림/마이페이지. 왼쪽 아이콘 사이드바, 오른쪽 네이비 프로필·인기글·공지.
- **모바일:** 햄버거 드로어에 같은 사이드바. 검색은 헤더 아이콘.

사이드바는 `SIDEBAR_NAV`, 피드 게시판은 `BOARD_NAV` (`src/lib/nav.ts`)입니다. 각 게시판은 시드 글 20개와 무한 스크롤(페이지 10개)을 사용합니다.

**마크 상점** (`/shop`)은 사이드바 기타 메뉴와 우측 프로필 카드의 [마크 상점]에서 들어갑니다. 상위 탭은 마크 / 프레임 / 이펙트입니다. 팀 마크 이미지는 `public/images/badges/team_1.png` ~ `team_6.png` 이며 웹 경로는 `/images/badges/team_1.png` 입니다. 착용 슬롯은 `equippedMarkId`(뱃지), `equippedFrameId`(테두리), `equippedEffectId`(후광·모션)입니다. 마크 장착은 `profileMarkImageUrl`로 게시글·댓글 닉네임 옆에 바로 반영됩니다.


스키마 확인은 `/schema` 입니다. 작성자 IP는 관리자에게만 표시됩니다.

관리자: `/admin/banners` (6구좌 AUTO/MANUAL/활성), `/admin/reports` (계정·IP·숨김/복구).

## 보안

- 익명 게시판은 화면에 닉네임을 숨기고 `authorId`·`authorIp`와 `AuditLog`를 남깁니다.
- 신고 3건 이상이면 글이 자동 숨김됩니다.
- 글 60초 / 댓글 20초 / 신고 30초 쿨다운(계정·IP). 출석 댓글은 제외.
- 응답에 `X-Frame-Options`, `nosniff` 등 보안 헤더를 붙입니다.

## 로컬 실행

Node.js 20+ 가 필요합니다.

```bash
cp .env.example .env
npm install
npx prisma migrate deploy
npx prisma db seed
npm run dev
```

개발 서버: `http://127.0.0.1:43123`

## 프로덕션

```bash
npx prisma migrate deploy
npx prisma db seed   # 초기 데이터가 필요할 때만
npm run build
npm start
```

SQLite는 로컬/단일 인스턴스용입니다. 트래픽이 늘면 `DATABASE_URL`만 PostgreSQL로 바꾸면 모델은 그대로입니다.

주요 인덱스: `Post(hidden, boardType, createdAt)`, `Post(authorIp, createdAt)`, `AuditLog(ip, createdAt)`, `Report(status, createdAt)`.

## 주요 스크립트

| 명령 | 설명 |
| --- | --- |
| `npm run dev` | 개발 서버 (포트 43123) |
| `npm run build` | Prisma generate + Next 프로덕션 빌드 |
| `npm start` | 프로덕션 서버 (포트 43123) |
| `npm run db:migrate` | 개발 마이그레이션 |
| `npm run db:deploy` | 프로덕션 마이그레이션 |
| `npm run db:seed` | 샘플 회원·게시글(게시판별 20개)·레벨·배너 구좌 |
| `npm test` | 게시판 피드 키·시드 카탈로그 단위 테스트 |
| `npm run db:reset` | DB 초기화 후 시드 |

스키마 원본은 `prisma/schema.prisma` 입니다.
