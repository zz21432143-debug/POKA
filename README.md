# POKA

홀덤 플레이어와 딜러를 위한 커뮤니티 웹사이트입니다.

PC와 모바일 브라우저(Android Chrome / iOS Safari)에서 같은 반응형 웹으로 접속합니다.

## 범위

1. **DB 모델** — 회원, 게시글, 댓글/출석, 레벨 경험치, 신고·감사 로그, 작성 쿨다운, 배너 구좌
2. **메인 레이아웃** — 어두운 펠트 헤더, 상단 검색·알림, 아이콘 사이드바, 프로필 위젯
3. **핸드리뷰** — 그래픽 에디터/뷰어, Fold/Check/Call/Raise 원클릭 투표, 작성 EXP 80(최고)
4. **출석** — 매일 0시(KST) 스레드, 댓글 1일 1회, 연속 출석
5. **게시판** — 대회 일정, 공식 홍보(제휴·협찬), 커뮤니티(출석/질문/현장 스케치/자유/핸드리뷰), 구인·구직 5종
6. **게이미피케이션** — 글/댓글/추천 수신 EXP, 인증 딜러 골드 뱃지, 레벨 보상(라이브/헌터/에이스), [마크 상점](/shop) (팀 마크 6종 2,000P, 구매·착용)

7. **5단계** — 모바일 터치 최적화, 작성 쿨다운, 신고 자동 숨김, 배너 수동/자동 관리, 프로덕션 빌드
8. **딜러 연습** — `/practice` 사이드팟·미니멈 레이즈 10문제. 비회원도 플레이, 로그인 시 기록·순위·EXP

글 작성·본문 열람·댓글은 로그인한 회원만 가능합니다. 게시판 목록(제목)은 비회원도 볼 수 있습니다. 공식 홍보와 대회 스케줄 등록은 관리자만 가능합니다. 시드된 계정(펠트딜러 등)의 로컬 비밀번호는 `poka1234` 입니다.

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

- **PC:** 상단 로고 + 홈/커뮤니티/정보센터/구인 + 검색 + 알림/마이페이지. 왼쪽 게시판 사이드바, 오른쪽 프로필·인기글·공지.
- **모바일:** 햄버거 드로어에 같은 사이드바. 검색은 헤더 아이콘.

사이드바는 `SIDEBAR_NAV`, 피드 게시판은 `BOARD_NAV` (`src/lib/nav.ts`)입니다. 각 게시판은 시드 글 20개와 무한 스크롤(페이지 10개)을 사용합니다.

**마크 상점** (`/shop`)은 사이드바 기타 메뉴와 우측 프로필 카드의 [마크 상점]에서 들어갑니다. 상위 탭은 마크 / 프레임 / 이펙트입니다. 팀 마크 이미지는 `public/images/badges/team_1.png` ~ `team_6.png` 이며 웹 경로는 `/images/badges/team_1.png` 입니다. 착용 슬롯은 `equippedMarkId`(뱃지), `equippedFrameId`(테두리), `equippedEffectId`(후광·모션)입니다. 마크 장착은 `profileMarkImageUrl`로 게시글·댓글 닉네임 옆에 바로 반영됩니다.


스키마 확인은 `/schema` 입니다. 작성자 IP는 관리자에게만 표시됩니다.

관리자: `/admin/banners` (6구좌 AUTO/MANUAL/활성), `/admin/reports` (계정·IP·숨김/복구).

## 보안

- 신고 3건 이상이면 글이 자동 숨김됩니다.
- 글 60초 / 댓글 20초 / 신고 30초 쿨다운(계정·IP). 출석 댓글은 제외.
- 응답에 `X-Frame-Options`, `nosniff` 등 보안 헤더를 붙입니다.

## 로컬 실행

Node.js 20+ 가 필요합니다.

```bash
cp .env.example .env
# DATABASE_URL 에 PostgreSQL 주소를 넣습니다. 로컬은 `npx prisma dev` 또는 Docker.
npm install
npx prisma migrate deploy
npx prisma db seed
npm run dev
```

개발 서버: `http://127.0.0.1:43123`

Cursor 미리보기 대신 **바탕화면에서** 열려면:

```bash
bash desktop/install-shortcut.sh
```

리눅스 바탕화면에 `POKA` 아이콘이 생깁니다. 더블클릭하면 서버를 확인하고 Chrome 앱 창으로 엽니다. 이미 설치했다면 `npm run app` 또는 `bash desktop/open-poka.sh`입니다.

**Windows:** `POKA.bat`만 받아서 바탕화면에 두면 열리지 않습니다. 프로젝트 폴더에서 `desktop\POKA.bat`을 실행하세요. 브라우저 바로가기는 `desktop\윈도우-바탕화면설치.bat`이 바탕화면에 `POKA.url`을 만듭니다. 다운로드한 bat이 막히면 우클릭 → 속성 → 차단 해제. 안내는 `desktop/윈도우.txt`입니다.

## 도메인 pokerwiki.co.kr (카페24)

도메인은 카페24에서 샀고, 사이트 공개 주소는 `https://pokerwiki.co.kr` 입니다. `www`는 본주소로 넘깁니다.

카페24 **일반 웹호스팅(PHP·FTP)** 에는 Next.js가 올라가지 않습니다. Node가 되는 VPS·클라우드(또는 Cafe24 클라우드)에 `npm run build && npm start`로 띄운 뒤, 카페24 도메인만 DNS로 붙입니다.

카페24 마이페이지 → 도메인 관리 → DNS 설정 예시:

| 호스트 | 타입 | 값 |
| --- | --- | --- |
| @ | A | 서버 공인 IP |
| www | CNAME | pokerwiki.co.kr |

서버를 아직 안 켰으면 DNS는 비워 두세요. 연결되면 `.env`에 다음을 넣습니다.

```
NEXT_PUBLIC_SITE_URL=https://pokerwiki.co.kr
KAKAO_REDIRECT_URI=https://pokerwiki.co.kr/api/auth/kakao/callback
```

카카오 개발자 콘솔 Redirect URI에도 같은 주소를 등록합니다.

## 프로덕션 (Vercel + Neon)

앱은 Vercel Hobby, DB는 Neon Postgres입니다. 카페24는 도메인만 쓰고 PHP 호스팅에는 올리지 않습니다.

Vercel 프로젝트 환경 변수:

| Key | 값 |
| --- | --- |
| `DATABASE_URL` | Neon Connect, Connection pooling **ON** (호스트에 `-pooler`) |
| `DATABASE_URL_UNPOOLED` | 같은 모달에서 pooling **OFF** |
| `NEXT_PUBLIC_SITE_URL` | `https://pokerwiki.co.kr` |

Vercel Optional Integrations의 **Prisma Postgres Add 는 누르지 않습니다.** 이미 Neon을 씁니다.

`npm run build`가 Neon 연결 확인, `prisma migrate deploy`, (회원이 없을 때만) seed, 그다음 Next 빌드를 실행합니다. 로컬에서 데이터를 지우고 다시 넣으려면 `npm run db:seed` (`SEED_RESET=1`)입니다.

```bash
npx prisma migrate deploy
npx prisma db seed   # 빈 DB 첫 배포. 이미 회원이 있으면 건너뜁니다
npm run build
npm start
```

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
