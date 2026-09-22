# 펠트클럽 (Felt Club)

포커 플레이어와 딜러를 위한 커뮤니티 웹사이트입니다.  
현재는 **1단계: DB 테이블 구조와 기본 프로젝트 구성**까지 구현되어 있습니다.

PC와 모바일 브라우저(Android/iOS)에서 같은 반응형 웹으로 접속합니다.

## 1단계 범위

- Next.js(App Router) + TypeScript + Tailwind + shadcn/ui
- Prisma + SQLite (로컬 기본값, 이후 PostgreSQL로 교체 가능)
- 회원 / 게시글 / 댓글·출석 / 레벨 경험치 테이블
- 시드 데이터와 스키마 확인 화면

인증, 실제 글쓰기, 추천 투표 로직은 다음 단계에서 붙입니다.

## 데이터 모델

```
User 1 ─── * Post (authorId, 익명 후기는 null)
User 1 ─── * Comment
Post 1 ─── * Comment (출석 기록은 postId를 비울 수 있음)
LevelExp (레벨 PK, 누적 EXP, 마크 구매 포인트)
```

| 테이블 | 역할 |
| --- | --- |
| `User` | 닉네임, 프로필 마크, 레벨, EXP, 포인트, 딜러 인증 |
| `Post` | `BoardType` 분류(자유/핸드리뷰/익명후기/구인구직/홍보), 제목, 내용, 추천·비추천, 작성자 IP |
| `Comment` | 게시글 댓글 또는 출석체크 (`isAttendanceCheck`) |
| `LevelExp` | 레벨별 필요 누적 경험치와 마크 구매 포인트 |

게시판 분류 값: `FREE`, `HAND_REVIEW`, `ANONYMOUS_REVIEW`, `JOBS`, `PROMO`.

## 로컬 실행

Node.js 20+ 가 필요합니다.

```bash
cp .env.example .env
npm install
npx prisma migrate dev --name init
npx prisma db seed
npm run dev
```

개발 서버는 `http://127.0.0.1:43123` 에서 스키마 확인 화면을 엽니다.

## 주요 스크립트

| 명령 | 설명 |
| --- | --- |
| `npm run dev` | 개발 서버 (포트 43123) |
| `npm run db:migrate` | 마이그레이션 |
| `npm run db:seed` | 샘플 회원·게시글·레벨 표 |
| `npm run db:reset` | DB 초기화 후 시드 |

스키마 원본은 `prisma/schema.prisma` 입니다.
