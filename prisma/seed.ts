import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { MemberKind, PrismaClient } from "../src/generated/prisma/client";
import { todayKstDate, weekStartKst, yesterdayKstDate } from "../src/lib/dates";
import { WEEKLY_HAND_EXP } from "../src/lib/rewards";
import { ATTENDANCE_LINES, catalogPosts, SEED_NICKNAMES } from "../src/lib/seed-catalog";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./prisma/dev.db",
});
const prisma = new PrismaClient({ adapter });

const LEVELS = Array.from({ length: 20 }, (_, i) => {
  const level = i + 1;
  const requiredExp = Math.round(100 * (level - 1) ** 2.15);
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
  await prisma.handPollVote.deleteMany();
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
  const markList = marks;

  const today = todayKstDate();
  const yesterday = yesterdayKstDate(today);

  const users = [];
  for (const [index, nickname] of SEED_NICKNAMES.entries()) {
    const verified = nickname === "펠트딜러" || nickname === "크라운딜러";
    const user = await prisma.user.create({
      data: {
        nickname,
        profileMarkImageUrl: markList[index % markList.length].imageUrl,
        equippedMarkId: markList[index % markList.length].id,
        level: nickname === "펠트딜러" ? 8 : 1 + (index % 7),
        exp: nickname === "펠트딜러" ? 7400 : 40 + index * 80,
        points: nickname === "펠트딜러" ? 1840 : 10 + index * 15,
        isDealerVerified: verified,
        isAdmin: nickname === "펠트딜러",
        memberKind: verified ? MemberKind.COMPANY : MemberKind.INDIVIDUAL,
        lastAttendanceDate: index < 20 ? today : yesterday,
        attendanceStreak: index < 20 ? 1 + (index % 6) : 0,
      },
    });
    users.push(user);
    await prisma.userMark.create({
      data: { userId: user.id, markId: markList[index % markList.length].id },
    });
  }

  const byNick = Object.fromEntries(users.map((user) => [user.nickname, user]));
  const dealer = byNick.펠트딜러;
  const regular = byNick.핸드헌터;

  const catalog = catalogPosts(today);
  const createdPosts: { id: string; title: string; boardType: string }[] = [];

  for (const rows of Object.values(catalog)) {
    for (const row of rows) {
      const author = byNick[row.authorNickname] ?? dealer;
      const createdAt = new Date(Date.now() - row.daysAgo * 86_400_000 - 60_000);
      const post = await prisma.post.create({
        data: {
          boardType: row.boardType,
          jobKind: row.jobKind,
          authorId: author.id,
          title: row.title,
          content: row.content,
          upvoteCount: row.upvoteCount,
          authorIp: "203.0.113.10",
          createdAt,
          bannerImageUrl: row.bannerImageUrl,
          promoLocation: row.promoLocation,
          promoTag: row.promoTag,
          storeVerified: Boolean(row.storeVerified),
          eventDate: row.eventDate,
          eventEndDate: row.eventEndDate,
          eventPrize: row.eventPrize,
          eventLink: row.eventLink,
          handReviewJson: row.handReview ? JSON.stringify(SAMPLE_HAND) : null,
          ratingManner: row.ratings?.[0],
          ratingService: row.ratings?.[1],
          ratingFacility: row.ratings?.[2],
          ratingAtmosphere: row.ratings?.[3],
          jobLocation: row.jobLocation,
          jobCompanyName: row.jobCompanyName,
          jobPayType: row.jobPayType,
          jobPayAmount: row.jobPayAmount,
          jobSchedule: row.jobSchedule,
          jobWorkHours: row.jobWorkHours,
          jobBenefits: row.jobBenefits,
          jobExperience: row.jobExperience,
          jobContact: row.jobContact,
          jobWorkDate: row.jobWorkDate,
          jobDateFlexible: Boolean(row.jobDateFlexible),
          jobGuaranteedHours: row.jobGuaranteedHours,
          jobOvertime: row.jobOvertime,
          jobTravelPay: Boolean(row.jobTravelPay),
          jobSnacks: Boolean(row.jobSnacks),
          jobDressCode: row.jobDressCode,
          jobApplyMethod: row.jobApplyMethod,
          isPaid: Boolean(row.isPaid),
        },
      });
      createdPosts.push(post);
      if (row.boardType === "ANONYMOUS_REVIEW") {
        await prisma.auditLog.create({
          data: {
            kind: "ANONYMOUS_POST",
            userId: author.id,
            ip: "198.51.100.44",
            postId: post.id,
            detail: post.title,
          },
        });
      }
    }
  }

  const promoNight = createdPosts.find((post) => post.title === "강남 캐주얼 나이트");
  await prisma.bannerSlot.createMany({
    data: [
      { slot: 1, mode: "MANUAL", enabled: true, postId: promoNight?.id ?? null },
      { slot: 2, mode: "AUTO", enabled: true },
      { slot: 3, mode: "AUTO", enabled: true },
      { slot: 4, mode: "AUTO", enabled: true },
      { slot: 5, mode: "AUTO", enabled: true },
      { slot: 6, mode: "AUTO", enabled: true },
    ],
  });

  const attendancePost = await prisma.post.create({
    data: {
      boardType: "FREE",
      title: `${today} 오늘의 출석체크`,
      content: "이 글에 댓글을 남기면 출석으로 인정합니다. 하루 한 번만 가능합니다.",
      isAttendanceThread: true,
      attendanceDate: today,
    },
  });

  for (const [index, line] of ATTENDANCE_LINES.entries()) {
    const user = users[index];
    const comment = await prisma.comment.create({
      data: {
        postId: attendancePost.id,
        authorId: user.id,
        content: line,
        isAttendanceCheck: true,
      },
    });
    await prisma.dailyAttendance.create({
      data: {
        userId: user.id,
        date: today,
        postId: attendancePost.id,
        commentId: comment.id,
      },
    });
  }

  const handReview = createdPosts.find((post) => post.boardType === "HAND_REVIEW");
  if (handReview) {
    await prisma.handPollVote.createMany({
      data: [
        { postId: handReview.id, userId: dealer.id, choice: "RAISE" },
        { postId: handReview.id, userId: regular.id, choice: "CALL" },
      ],
    });
    await prisma.comment.create({
      data: {
        postId: handReview.id,
        authorId: dealer.id,
        content: "인증 딜러 입장에서 Raise 빈도를 조금 낮추고 Call 위주로 갑니다.",
        upvoteCount: 14,
      },
    });
  }

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
        message: `🔥 ${regular.nickname}님이 연속 출석 달성! (경험치 보너스 획득)`,
        href: "/attendance",
      },
      {
        kind: `POPULAR:${handReview?.id ?? "hand"}`,
        message: `⭐ ${dealer.nickname}님의 핸드리뷰가 인기 게시물로 선정되었습니다!`,
        href: handReview ? `/posts/${handReview.id}` : "/boards/hand-review",
      },
      {
        kind: `DEALER:${dealer.id}`,
        message: `👑 ${dealer.nickname}님이 '인증 딜러' 자격을 획득하셨습니다!`,
        href: `/u/${encodeURIComponent(dealer.nickname)}`,
      },
      {
        kind: `WEEKLY_HAND:${week}`,
        message: `♠️ ${dealer.nickname}님의 핸드리뷰가 주간 최고의 분석글로 선정되어 +${WEEKLY_HAND_EXP.toLocaleString()} EXP를 획득하셨습니다!`,
        href: "/boards/hand-review",
      },
    ],
  });

  console.log(`Seed complete. posts=${createdPosts.length} attendance=${ATTENDANCE_LINES.length}`);
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
