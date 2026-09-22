import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient, BoardType } from "../src/generated/prisma/client";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./prisma/dev.db",
});
const prisma = new PrismaClient({ adapter });

const LEVELS = Array.from({ length: 20 }, (_, i) => {
  const level = i + 1;
  const requiredExp = Math.round(100 * ((level - 1) ** 2.15));
  const markPurchasePoints = 200 + (level - 1) * 150;
  return { level, requiredExp, markPurchasePoints };
});

async function main() {
  await prisma.comment.deleteMany();
  await prisma.post.deleteMany();
  await prisma.user.deleteMany();
  await prisma.levelExp.deleteMany();

  await prisma.levelExp.createMany({ data: LEVELS });

  const [dealer, regular, newbie] = await Promise.all([
    prisma.user.create({
      data: {
        nickname: "펠트딜러",
        profileMarkImageUrl: "/marks/dealer.svg",
        level: 8,
        exp: 6200,
        points: 1840,
        isDealerVerified: true,
      },
    }),
    prisma.user.create({
      data: {
        nickname: "핸드헌터",
        profileMarkImageUrl: "/marks/chip.svg",
        level: 4,
        exp: 1450,
        points: 320,
        isDealerVerified: false,
      },
    }),
    prisma.user.create({
      data: {
        nickname: "신입버튼",
        profileMarkImageUrl: null,
        level: 1,
        exp: 40,
        points: 10,
        isDealerVerified: false,
      },
    }),
  ]);

  const freePost = await prisma.post.create({
    data: {
      boardType: BoardType.FREE,
      authorId: regular.id,
      title: "오늘 캐주얼에서 겪은 이상한 런",
      content:
        "숏스택으로 3bet 콜 받은 뒤 보드가 A-high monotone. 플롭 체크-체크 후 턴 오버벳을 맞았습니다. 비슷한 스팟 공유 부탁합니다.",
      upvoteCount: 12,
      downvoteCount: 1,
      authorIp: "203.0.113.10",
    },
  });

  const handReview = await prisma.post.create({
    data: {
      boardType: BoardType.HAND_REVIEW,
      authorId: dealer.id,
      title: "BTN vs BB, 100bb, AJs 3bet pot",
      content:
        "프리플랍 BB 오픈, BTN 3bet AJs, 콜. 플롭 Kh 7s 2d. 상대 donk 33%. 여기서 콜/레이즈 기준을 정리하고 싶습니다.",
      upvoteCount: 28,
      downvoteCount: 0,
      authorIp: "203.0.113.21",
    },
  });

  await prisma.post.create({
    data: {
      boardType: BoardType.ANONYMOUS_REVIEW,
      authorId: null,
      title: "강남 캐주얼 룸 딜러 진행 후기",
      content:
        "셔플 속도와 팟 정리가 빠르고, 테이블 매너 안내도 명확했습니다. 익명으로만 남깁니다.",
      upvoteCount: 9,
      downvoteCount: 2,
      authorIp: "198.51.100.44",
    },
  });

  await prisma.post.create({
    data: {
      boardType: BoardType.JOBS,
      authorId: dealer.id,
      title: "주말 캐주얼 딜러 구인 (강남)",
      content:
        "금/토 야간 딜러 1명. 라이브 캐주얼 경험 우대. 딜러 인증 회원 우선 연락드립니다.",
      upvoteCount: 6,
      downvoteCount: 0,
      authorIp: "203.0.113.21",
    },
  });

  await prisma.post.create({
    data: {
      boardType: BoardType.PROMO,
      authorId: newbie.id,
      title: "스터디 그룹 첫 모임 안내",
      content: "핸드리뷰 위주 온라인 스터디입니다. 주 1회, 초보 환영.",
      upvoteCount: 3,
      downvoteCount: 0,
      authorIp: "192.0.2.8",
    },
  });

  await prisma.comment.createMany({
    data: [
      {
        postId: handReview.id,
        authorId: regular.id,
        content: "플롭 donk 상대면 AJs는 대체로 콜하고 턴 텍스처 보고 결정하는 편입니다.",
        isAttendanceCheck: false,
      },
      {
        postId: freePost.id,
        authorId: newbie.id,
        content: "비슷한 런 저도 당했습니다. 핸드히스토리 더 올려주시면 같이 볼게요.",
        isAttendanceCheck: false,
      },
      {
        postId: null,
        authorId: dealer.id,
        content: "2026-09-22 출석",
        isAttendanceCheck: true,
      },
      {
        postId: null,
        authorId: regular.id,
        content: "오늘도 출석합니다.",
        isAttendanceCheck: true,
      },
    ],
  });

  console.log("Seed complete: 20 levels, 3 users, 5 posts, 4 comments.");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
