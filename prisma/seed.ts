import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { BoardType, JobKind, PrismaClient } from "../src/generated/prisma/client";
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
  await prisma.writeThrottle.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.bannerSlot.deleteMany();
  await prisma.postVote.deleteMany();
  await prisma.report.deleteMany();
  await prisma.dailyAttendance.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.post.deleteMany();
  await prisma.userMark.deleteMany();
  await prisma.user.updateMany({ data: { equippedMarkId: null } });
  await prisma.mark.deleteMany();
  await prisma.user.deleteMany();
  await prisma.levelExp.deleteMany();

  await prisma.levelExp.createMany({ data: LEVELS });

  const marks = await Promise.all(
    [
      { slug: "dealer", name: "딜러 스타", imageUrl: "/marks/dealer.svg", pricePoints: 0, minLevel: 1 },
      { slug: "chip", name: "칩", imageUrl: "/marks/chip.svg", pricePoints: 120, minLevel: 1 },
      { slug: "ace", name: "에이스", imageUrl: "/marks/ace.svg", pricePoints: 400, minLevel: 3 },
      { slug: "spade", name: "스페이드", imageUrl: "/marks/spade.svg", pricePoints: 280, minLevel: 2 },
      { slug: "heart", name: "하트", imageUrl: "/marks/heart.svg", pricePoints: 280, minLevel: 2 },
      { slug: "club", name: "클럽", imageUrl: "/marks/club.svg", pricePoints: 280, minLevel: 2 },
      { slug: "crown", name: "크라운", imageUrl: "/marks/crown.svg", pricePoints: 900, minLevel: 8 },
    ].map((data) => prisma.mark.create({ data })),
  );
  const bySlug = Object.fromEntries(marks.map((mark) => [mark.slug, mark]));

  const today = todayKstDate();
  const yesterday = yesterdayKstDate(today);

  const dealer = await prisma.user.create({
    data: {
      nickname: "펠트딜러",
      profileMarkImageUrl: bySlug.dealer.imageUrl,
      equippedMarkId: bySlug.dealer.id,
      level: 8,
      exp: 7400,
      points: 1840,
      isDealerVerified: true,
      isAdmin: true,
      lastAttendanceDate: yesterday,
      attendanceStreak: 5,
    },
  });
  const regular = await prisma.user.create({
    data: {
      nickname: "핸드헌터",
      profileMarkImageUrl: bySlug.chip.imageUrl,
      equippedMarkId: bySlug.chip.id,
      level: 4,
      exp: 1450,
      points: 320,
      isDealerVerified: false,
      lastAttendanceDate: today,
      attendanceStreak: 3,
    },
  });
  const newbie = await prisma.user.create({
    data: {
      nickname: "신입버튼",
      profileMarkImageUrl: null,
      level: 1,
      exp: 40,
      points: 10,
      isDealerVerified: false,
    },
  });

  await prisma.userMark.createMany({
    data: [
      { userId: dealer.id, markId: bySlug.dealer.id },
      { userId: dealer.id, markId: bySlug.ace.id },
      { userId: regular.id, markId: bySlug.chip.id },
    ],
  });

  const freePost = await prisma.post.create({
    data: {
      boardType: BoardType.FREE,
      authorId: regular.id,
      title: "오늘 캐주얼에서 겪은 이상한 런",
      content:
        "숏스택으로 3bet 콜 받은 뒤 보드가 A-high monotone. 플롭 체크-체크 후 턴 오버벳을 맞았습니다.",
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
      content: "플롭 donk 33% 스팟입니다. 턴 텍스처별 플랜을 정리하고 싶습니다.",
      handReviewJson: JSON.stringify(SAMPLE_HAND),
      upvoteCount: 28,
      downvoteCount: 0,
      authorIp: "203.0.113.21",
    },
  });

  const reviewPost = await prisma.post.create({
    data: {
      boardType: BoardType.ANONYMOUS_REVIEW,
      authorId: newbie.id,
      title: "강남 캐주얼 룸 딜러 진행 후기",
      content: "셔플 속도와 팟 정리가 빠르고, 테이블 매너 안내도 명확했습니다.",
      upvoteCount: 9,
      downvoteCount: 2,
      authorIp: "198.51.100.44",
    },
  });
  await prisma.auditLog.create({
    data: {
      kind: "ANONYMOUS_POST",
      userId: newbie.id,
      ip: "198.51.100.44",
      postId: reviewPost.id,
      detail: reviewPost.title,
    },
  });
  await prisma.report.create({
    data: {
      postId: reviewPost.id,
      reporterId: regular.id,
      reason: "사실 확인이 필요한 루머로 보입니다.",
      reporterIp: "203.0.113.10",
      status: "PENDING",
    },
  });

  await prisma.post.create({
    data: {
      boardType: BoardType.JOBS,
      jobKind: JobKind.FIXED,
      isPaid: true,
      authorId: dealer.id,
      title: "강남 캐주얼 고정 딜러",
      content: "주말 고정 딜러. 라이브 경험 우대.",
      jobLocation: "강남",
      jobPay: "세션비 협의",
      jobSchedule: "금·토 20시",
      jobHeadcount: "1명",
      upvoteCount: 6,
      authorIp: "203.0.113.21",
    },
  });
  await prisma.post.create({
    data: {
      boardType: BoardType.JOBS,
      jobKind: JobKind.APPLY,
      authorId: dealer.id,
      title: "주말 스태프 지원 모집",
      content: "칩런·플로어 지원서를 받습니다.",
      jobLocation: "홍대",
      jobPay: "시급",
      jobSchedule: "토 오후",
      jobHeadcount: "2명",
      authorIp: "203.0.113.21",
    },
  });
  await prisma.post.create({
    data: {
      boardType: BoardType.JOBS,
      jobKind: JobKind.TEAM,
      authorId: regular.id,
      title: "목요 캐주얼 팀 1명",
      content: "100bb 캐주얼 세션 멤버 구합니다.",
      jobLocation: "온라인",
      jobPay: "엔트리 자율",
      jobSchedule: "목 21시",
      jobHeadcount: "1명",
      authorIp: "203.0.113.10",
    },
  });

  await prisma.post.create({
    data: {
      boardType: BoardType.PROMO,
      authorId: newbie.id,
      title: "스터디 그룹 첫 모임 안내",
      content: "핸드리뷰 위주 온라인 스터디입니다.",
      authorIp: "192.0.2.8",
    },
  });
  const promoNight = await prisma.post.create({
    data: {
      boardType: BoardType.PROMO,
      authorId: dealer.id,
      title: "강남 캐주얼 나이트",
      content: "프리미엄 배너 1구좌 연동 홍보글입니다.",
      bannerSlot: 1,
      bannerImageUrl: "/banners/slot-1.svg",
      authorIp: "203.0.113.21",
    },
  });
  await prisma.post.create({
    data: {
      boardType: BoardType.PROMO,
      authorId: dealer.id,
      title: "주말 딜러 오픈",
      content: "프리미엄 배너 2구좌.",
      bannerSlot: 2,
      bannerImageUrl: "/banners/slot-2.svg",
      authorIp: "203.0.113.21",
    },
  });
  await prisma.bannerSlot.createMany({
    data: [
      { slot: 1, mode: "MANUAL", enabled: true, postId: promoNight.id },
      { slot: 2, mode: "AUTO", enabled: true },
      { slot: 3, mode: "AUTO", enabled: true },
      { slot: 4, mode: "AUTO", enabled: true },
      { slot: 5, mode: "AUTO", enabled: false },
      { slot: 6, mode: "AUTO", enabled: true },
    ],
  });

  const attendancePost = await prisma.post.create({
    data: {
      boardType: BoardType.FREE,
      title: `${today} 오늘의 출석체크`,
      content: "이 글에 댓글을 남기면 출석으로 인정합니다. 하루 한 번만 가능합니다.",
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
      },
      {
        postId: freePost.id,
        authorId: newbie.id,
        content: "비슷한 런 저도 당했습니다.",
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
