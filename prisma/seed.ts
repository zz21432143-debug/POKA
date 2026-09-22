import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient, BoardType } from "../src/generated/prisma/client";
import { todayKstDate, yesterdayKstDate } from "../src/lib/dates";

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

const SAMPLE_HAND = {
  heroPosition: "BTN",
  villainPosition: "BB",
  heroCards: ["Ah", "Js"],
  villainCards: [],
  board: ["Kh", "7s", "2d"],
  effectiveBb: 100,
  streets: {
    preflop: [
      { actor: "Villain", action: "raise", amount: 2.5 },
      { actor: "Hero", action: "raise", amount: 9 },
      { actor: "Villain", action: "call" },
    ],
    flop: [
      { actor: "Villain", action: "bet", amount: 33 },
      { actor: "Hero", action: "call" },
    ],
    turn: [],
    river: [],
  },
};

async function main() {
  await prisma.dailyAttendance.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.post.deleteMany();
  await prisma.user.deleteMany();
  await prisma.levelExp.deleteMany();

  await prisma.levelExp.createMany({ data: LEVELS });

  const today = todayKstDate();
  const yesterday = yesterdayKstDate(today);

  const [dealer, regular, newbie] = await Promise.all([
    prisma.user.create({
      data: {
        nickname: "펠트딜러",
        profileMarkImageUrl: "/marks/dealer.svg",
        level: 8,
        exp: 7400,
        points: 1840,
        isDealerVerified: true,
        lastAttendanceDate: yesterday,
        attendanceStreak: 5,
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
        lastAttendanceDate: today,
        attendanceStreak: 3,
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
        "플롭 donk 33% 스팟입니다. Hero가 콜한 뒤 턴 텍스처별 플랜을 정리하고 싶습니다.",
      handReviewJson: JSON.stringify(SAMPLE_HAND),
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

  const attendancePost = await prisma.post.create({
    data: {
      boardType: BoardType.FREE,
      title: `${today} 오늘의 출석체크`,
      content:
        "스팸 클릭을 막기 위해 이 글에 댓글을 남기면 출석으로 인정합니다. 하루 한 번만 가능합니다.",
      isAttendanceThread: true,
      attendanceDate: today,
    },
  });

  const hunterComment = await prisma.comment.create({
    data: {
      postId: attendancePost.id,
      authorId: regular.id,
      content: "오늘도 핸드 공부합니다.",
      isAttendanceCheck: true,
    },
  });

  await prisma.dailyAttendance.create({
    data: {
      userId: regular.id,
      date: today,
      postId: attendancePost.id,
      commentId: hunterComment.id,
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
    ],
  });

  console.log("Seed complete.");
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
