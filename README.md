# POKA

포커 플레이어와 딜러를 위한 커뮤니티 웹사이트입니다.

PC와 모바일 브라우저(Android Chrome / iOS Safari)에서 같은 반응형 웹으로 접속합니다.

## 범위

1. **DB 모델** — 회원, 게시글, 댓글/출석, 레벨 경험치, 신고·감사 로그, 작성 쿨다운, 배너 구좌
2. **메인 레이아웃** — 좌/우 게시판 사이드바, 프로필 위젯, 모바일 햄버거 드로어, 프리미엄 배너 6구좌
3. **핸드리뷰** — 그래픽 에디터/뷰어, 작성 EXP 80(최고)
4. **출석** — 매일 0시(KST) 스레드, 댓글 1일 1회, 연속 출석
5. **게시판** — 구인 3종(고정 직원/지원 딜러/딜러 팀, 제목 자동 생성, 연락처 로그인 후 공개), 검증 매장 공식 홍보(메인 6구좌), 관리자 전국 대회 일정
6. **게이미피케이션** — 글/댓글/추천 수신 EXP, 마크 상점 구매·착용
7. **5단계** — 모바일 터치 최적화, 작성 쿨다운, 신고 자동 숨김, 배너 수동/자동 관리, 프로덕션 빌드

현재 로그인은 시드된 검증 딜러(펠트딜러, 관리자)를 사용합니다.

## 화면 구조

- **PC:** 왼쪽 사이드바는 게시판만. 오른쪽 사이드바는 프로필(마크 상점 버튼) + AdSense 영역
- **모바일:** 상단 고정 헤더에 햄버거와 요약 프로필. 게시판·상점은 왼쪽 GNB 드로어
- **배너:** 채워진 구좌는 홍보글, 빈 구좌는 「홍보 등록 문의 (+)」
- **전광판:** 헤더 바로 아래 전체 너비. 모든 게시판·상세에서 공통 노출

게시판 메뉴: 공식 홍보, 전국 대회 일정, 구인 3종, 딜러 커뮤니티, 핸드리뷰, 매장후기, 출석.

스키마 확인은 `/schema` 입니다. 작성자 IP는 관리자에게만 표시됩니다.

관리자: `/admin/banners` (6구좌 AUTO/MANUAL/활성), `/admin/reports` (계정·IP·숨김/복구).

## 보안

- 익명 매장후기는 화면에 닉네임을 숨기고 `authorId`·`authorIp`와 `AuditLog`를 남깁니다.
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
| `npm run db:seed` | 샘플 회원·게시글·레벨·배너 구좌 |
| `npm run db:reset` | DB 초기화 후 시드 |

스키마 원본은 `prisma/schema.prisma` 입니다.
