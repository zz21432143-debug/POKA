import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { BoardType, JobKind, PrismaClient } from "../src/generated/prisma/client";
import { todayKstDate, weekStartKst, yesterdayKstDate } from "../src/lib/dates";
import { WEEKLY_HAND_EXP } from "../src/lib/rewards";

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
  await prisma.tickerEvent.deleteMany();
  await prisma.writeThrottle.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.bannerSlot.deleteMany();
  await prisma.commentVote.deleteMany();
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
      viewCount: 412,
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
      title: "[서울 강남] POKA 펍 - 고정 직원 모집",
      content: "주말 포함 고정 딜러를 구합니다. 라이브 경험 우대.",
      jobLocation: "서울 강남",
      jobCompanyName: "POKA 펍",
      jobPayType: "월급",
      jobPayAmount: "3200000",
      jobSchedule: "주5일",
      jobWorkHours: "20:00–04:00",
      jobBenefits: "식대 · 교통비",
      jobExperience: "라이브 1년 이상",
      jobContact: "010-2000-1111",
      upvoteCount: 6,
      authorIp: "203.0.113.21",
    },
  });
  await prisma.post.create({
    data: {
      boardType: BoardType.JOBS,
      jobKind: JobKind.APPLY,
      authorId: dealer.id,
      title: "[경기 분당] 지원 딜러 (시급 20,000원)",
      content: "주말 스팟 딜러 지원을 받습니다.",
      jobLocation: "경기 분당",
      jobPayType: "시급",
      jobPayAmount: "20000",
      jobDateFlexible: false,
      jobWorkDate: "2026-10-03",
      jobGuaranteedHours: "6시간",
      jobOvertime: "가능",
      jobTravelPay: true,
      jobSnacks: true,
      jobDressCode: "올블랙",
      jobExperience: "스팟 딜러 경험",
      jobContact: "010-2000-2222",
      authorIp: "203.0.113.21",
    },
  });
  await prisma.post.create({
    data: {
      boardType: BoardType.JOBS,
      jobKind: JobKind.TEAM,
      authorId: regular.id,
      title: "[서울 전역] ACE 딜러팀 - 딜러 팀원 모집",
      content: "캐주얼·토너먼트 함께 도는 팀을 꾸립니다.",
      jobLocation: "서울 전역",
      jobCompanyName: "ACE 딜러팀",
      jobExperience: "WSOP 서킷 스태프",
      jobBenefits: "세션비 · 숙소",
      jobApplyMethod: "프로필 회신",
      jobContact: "010-3000-3333",
      authorIp: "203.0.113.10",
    },
  });

  await prisma.post.create({
    data: {
      boardType: BoardType.PROMO,
      authorId: newbie.id,
      title: "스터디 그룹 첫 모임 안내",
      content: "핸드리뷰 위주 온라인 스터디입니다.",
      bannerImageUrl: "/banners/slot-3.svg",
      promoLocation: "온라인",
      promoTag: "스터디 오픈",
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
      promoLocation: "강남",
      promoTag: "나이트 · 첫방문 칩",
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
      promoLocation: "홍대",
      promoTag: "주말 오픈",
      authorIp: "203.0.113.21",
    },
  });
  await prisma.post.create({
    data: {
      boardType: BoardType.PROMO,
      authorId: regular.id,
      title: "송파 캐주얼 클럽",
      content: "평일 미드 스테이크 세션 홍보.",
      bannerImageUrl: "/banners/slot-4.svg",
      promoLocation: "송파",
      promoTag: "평일 미드",
      authorIp: "203.0.113.10",
    },
  });
  await prisma.post.create({
    data: {
      boardType: BoardType.PROMO,
      authorId: dealer.id,
      title: "딜러 아카데미 설명회",
      content: "인증 딜러 과정 설명회.",
      bannerImageUrl: "/banners/slot-6.svg",
      promoLocation: "강남",
      promoTag: "교육 설명회",
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
        upvoteCount: 9,
      },
      {
        postId: handReview.id,
        authorId: newbie.id,
        content: "BB 입장에선 턴 텍스처 보고 포기하는 라인도 좋아 보입니다.",
        upvoteCount: 2,
      },
      {
        postId: freePost.id,
        authorId: newbie.id,
        content: "비슷한 런 저도 당했습니다.",
        upvoteCount: 1,
      },
    ],
  });

  const week = weekStartKst(today);
  await prisma.tickerEvent.createMany({
    data: [
      {
        kind: `LEVEL:${regular.id}:4`,
        message: `🎉 ${regular.nickname}님이 Lv.4을 달성하셨습니다!`,
        href: `/u/${encodeURIComponent(regular.nickname)}`,
      },
      {
        kind: `STREAK:${regular.id}:${today}`,
        message: `🔥 ${regular.nickname}님이 7일 연속 출석 달성! (경험치 보너스 획득)`,
        href: "/attendance",
      },
      {
        kind: `POPULAR:${handReview.id}`,
        message: `⭐ ${dealer.nickname}님의 [${handReview.title}]이 인기 게시물로 선정되었습니다!`,
        href: `/posts/${handReview.id}`,
      },
      {
        kind: `MARK:${dealer.id}:ace`,
        message: `🎰 ${dealer.nickname}님이 마크 상점에서 [에이스]를 구매하셨습니다!`,
        href: "/shop",
      },
      {
        kind: `DEALER:${dealer.id}`,
        message: `👑 ${dealer.nickname}님이 '인증 딜러' 자격을 획득하셨습니다!`,
        href: `/u/${encodeURIComponent(dealer.nickname)}`,
      },
      {
        kind: `WEEKLY_HAND:${week}`,
        message: `♠️ ${dealer.nickname}님의 핸드리뷰가 주간 '최고의 분석글'로 선정되어 +${WEEKLY_HAND_EXP.toLocaleString()} EXP를 획득하셨습니다!`,
        href: `/posts/${handReview.id}`,
      },
      {
        kind: "HIRE:seed-fixed",
        message: "🤝 [강남]에서 고정 직원 채용을 완료하셨습니다!",
        href: "/boards/jobs/fixed",
      },
      {
        kind: `LUCKY:${today}:${regular.id}`,
        message: `🎁 ${regular.nickname}님이 오늘 1번째 출석자로 행운의 보너스 포인트를 획득하셨습니다!`,
        href: "/attendance",
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
