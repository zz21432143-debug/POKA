import "dotenv/config";
import { MemberKind } from "../src/generated/prisma/client";
import { prisma } from "../src/lib/db";
import { todayKstDate, weekStartKst, yesterdayKstDate, shiftDate } from "../src/lib/dates";
import { WEEKLY_HAND_EXP } from "../src/lib/rewards";
import { MASTER_ACCOUNT_NICKNAME } from "../src/lib/password";
import {
  ATTENDANCE_LINES,
  catalogPosts,
  SEED_NICKNAMES,
  VERIFIED_DEALER_NICKNAMES,
} from "../src/lib/seed-catalog";
import { FEATURED_OFFICIAL_POSTERS, PUBLIC_OFFICIAL_POSTERS } from "../src/lib/official-posters";
import { SAMPLE_TABLE_HAND } from "../src/lib/hand-review";
import { weeklyHubContent, weeklyHubTitle } from "../src/lib/growth";
import { buildLevelRows } from "../src/lib/levels";
import { MARK_PRICE_POINTS } from "../src/lib/rewards";
import { YOKAI_MARKS } from "../src/lib/yokai-marks";

const LEVELS = buildLevelRows();

async function main() {
  const reset = process.env.SEED_RESET === "1";
  if (!reset) {
    const existing = await prisma.user.count();
    if (existing > 0) {
      console.log("POKA seed skip: users already exist");
      return;
    }
  }

  await prisma.tickerEvent.deleteMany();
  await prisma.writeThrottle.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.bannerSlot.deleteMany();
  await prisma.sponsorUnit.deleteMany();
  await prisma.handPollVote.deleteMany();
  await prisma.commentVote.deleteMany();
  await prisma.postVote.deleteMany();
  await prisma.report.deleteMany();
  await prisma.dailyAttendance.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.post.deleteMany();
  await prisma.userMark.deleteMany();
  await prisma.userCosmetic.deleteMany();
  await prisma.user.updateMany({
    data: { equippedMarkId: null, equippedFrameId: null, equippedEffectId: null },
  });
  await prisma.profileCosmetic.deleteMany();
  await prisma.mark.deleteMany();
  await prisma.user.deleteMany();
  await prisma.levelExp.deleteMany();

  await prisma.levelExp.createMany({ data: LEVELS });

  const markRows = [
    { slug: "dealer", name: "딜러 스타", imageUrl: "/marks/dealer.svg", pricePoints: MARK_PRICE_POINTS, minLevel: 1, category: "LEVEL" as const },
    { slug: "crown", name: "크라운", imageUrl: "/marks/crown.svg", pricePoints: MARK_PRICE_POINTS, minLevel: 1, category: "LEVEL" as const },
    { slug: "chip", name: "칩", imageUrl: "/marks/chip.svg", pricePoints: MARK_PRICE_POINTS, minLevel: 1, category: "SPECIAL" as const },
    { slug: "ace", name: "에이스", imageUrl: "/marks/ace.svg", pricePoints: MARK_PRICE_POINTS, minLevel: 1, category: "SPECIAL" as const },
    { slug: "spade", name: "스페이드", imageUrl: "/marks/spade.svg", pricePoints: MARK_PRICE_POINTS, minLevel: 1, category: "SPECIAL" as const },
    { slug: "heart", name: "하트", imageUrl: "/marks/heart.svg", pricePoints: MARK_PRICE_POINTS, minLevel: 1, category: "SPECIAL" as const },
    { slug: "club", name: "클럽", imageUrl: "/marks/club.svg", pricePoints: MARK_PRICE_POINTS, minLevel: 1, category: "SPECIAL" as const },
    { slug: "team-a", name: "TOP", imageUrl: "/images/badges/team_1.png", pricePoints: MARK_PRICE_POINTS, minLevel: 1, category: "TEAM" as const },
    { slug: "team-b", name: "PLIME", imageUrl: "/images/badges/team_2.png", pricePoints: MARK_PRICE_POINTS, minLevel: 1, category: "TEAM" as const },
    { slug: "team-c", name: "HAM", imageUrl: "/images/badges/team_3.png", pricePoints: MARK_PRICE_POINTS, minLevel: 1, category: "TEAM" as const },
    { slug: "team-d", name: "ROCKET", imageUrl: "/images/badges/team_4.png", pricePoints: MARK_PRICE_POINTS, minLevel: 1, category: "TEAM" as const },
    { slug: "team-e", name: "GUNNER", imageUrl: "/images/badges/team_5.png", pricePoints: MARK_PRICE_POINTS, minLevel: 1, category: "TEAM" as const },
    { slug: "team-f", name: "DOO", imageUrl: "/images/badges/team_6.png", pricePoints: MARK_PRICE_POINTS, minLevel: 1, category: "TEAM" as const },
    ...YOKAI_MARKS.map((mark) => ({
      slug: mark.slug,
      name: mark.name,
      imageUrl: mark.imageUrl,
      pricePoints: mark.pricePoints,
      minLevel: 1,
      category: "SPECIAL" as const,
    })),
  ];
  await prisma.mark.createMany({ data: markRows });
  const marks = await prisma.mark.findMany();
  const bySlug = Object.fromEntries(marks.map((mark) => [mark.slug, mark]));
  const markList = markRows.map((row) => bySlug[row.slug]!);

  const today = todayKstDate();
  const yesterday = yesterdayKstDate(today);

  const users = [];
  for (const [index, nickname] of SEED_NICKNAMES.entries()) {
    const verified = (VERIFIED_DEALER_NICKNAMES as readonly string[]).includes(nickname);
    const user = await prisma.user.create({
      data: {
        nickname,
        profileMarkImageUrl: markList[index % markList.length].imageUrl,
        equippedMarkId: markList[index % markList.length].id,
        level: nickname === "펠트딜러" ? 8 : verified ? 5 + (index % 3) : 1 + (index % 7),
        exp: nickname === "펠트딜러" ? 7400 : 40 + index * 80,
        points: nickname === "펠트딜러" ? 8200 : 10 + index * 15,
        isDealerVerified: false,
        isAdmin: nickname === "펠트딜러",
        memberKind: verified ? MemberKind.COMPANY : MemberKind.INDIVIDUAL,
        lastAttendanceDate: index < 20 ? today : yesterday,
        attendanceStreak: nickname === "펠트딜러" ? 14 : index < 20 ? 1 + (index % 6) : 0,
      },
    });
    users.push(user);
    await prisma.userMark.create({
      data: { userId: user.id, markId: markList[index % markList.length].id },
    });
  }

  await prisma.user.upsert({
    where: { nickname: MASTER_ACCOUNT_NICKNAME },
    create: {
      nickname: MASTER_ACCOUNT_NICKNAME,
      isAdmin: true,
      isMaster: true,
      level: 250,
      exp: 24900,
      points: 999999,
      termsAcceptedAt: new Date(),
    },
    update: {
      passwordHash: null,
      isAdmin: true,
      isMaster: true,
      level: 250,
      exp: 24900,
    },
  });

  const byNick = Object.fromEntries(users.map((user) => [user.nickname, user]));
  const dealer = byNick.펠트딜러;
  const regular = byNick.핸드헌터;

  const catalog = catalogPosts(today);
  const createdPosts: { id: string; title: string; boardType: string }[] = [];
  const officialTitles = new Set<string>(PUBLIC_OFFICIAL_POSTERS.map((row) => row.title));
  const slim = [
    ...catalog.official.filter((row) => officialTitles.has(row.title)),
    catalog["hand-review"][0],
    catalog.schedule[0],
    catalog.schedule[1],
    catalog["jobs/urgent"][0],
    catalog["jobs/fixed"][0],
  ].filter(Boolean);

  for (const row of slim) {
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
          handReviewJson: row.handReview ? JSON.stringify(SAMPLE_TABLE_HAND) : null,
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

  await prisma.bannerSlot.deleteMany();
  await prisma.sponsorUnit.deleteMany();
  const promoByTitle = Object.fromEntries(createdPosts.map((post) => [post.title, post]));
  await prisma.bannerSlot.createMany({
    data: FEATURED_OFFICIAL_POSTERS.map((poster, index) => ({
      slot: index + 1,
      mode: "MANUAL" as const,
      enabled: true,
      postId: promoByTitle[poster.title]?.id ?? null,
    })),
  });
  await prisma.sponsorUnit.createMany({
    data: [
      {
        placement: "A1",
        imageUrl: null,
        href: "/advertise",
        title: "",
        advertiser: "",
        mark: "AD",
        enabled: true,
      },
      {
        placement: "A2",
        imageUrl: null,
        href: "/advertise",
        title: "",
        advertiser: "",
        mark: "AD",
        enabled: true,
      },
      {
        placement: "A3",
        imageUrl: null,
        href: "/advertise",
        title: "",
        advertiser: "",
        mark: "AD",
        enabled: true,
      },
      {
        placement: "SIDEBAR",
        imageUrl: null,
        href: "/advertise",
        title: "",
        advertiser: "",
        mark: "제휴",
        enabled: true,
      },
      {
        placement: "NATIVE",
        imageUrl: null,
        href: "/advertise",
        title: "딜러 전용 유니폼, 지금 런칭 혜택으로 맞추세요",
        advertiser: "DEALER FIT",
        mark: "제휴",
        enabled: true,
      },
    ],
  });
  const publicTitles = PUBLIC_OFFICIAL_POSTERS.map((row) => row.title);
  await prisma.post.updateMany({
    where: { boardType: "PROMO", title: { notIn: [...publicTitles] } },
    data: { hidden: true },
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

  for (const [index, line] of ATTENDANCE_LINES.slice(0, 5).entries()) {
    const user = users[index];
    const comment = await prisma.comment.create({
      data: {
        postId: attendancePost.id,
        authorId: user.id,
        content: line,
        isAttendanceCheck: true,
        authorIp: "203.0.113.20",
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
        authorIp: "203.0.113.21",
      },
    });
  }

  const week = weekStartKst(today);
  const weekEnd = shiftDate(week, 6);
  const weekEvents = createdPosts.filter((post) => {
    if (post.boardType !== "SCHEDULE") return false;
    const full = catalog.schedule.find((row) => row.title === post.title);
    const eventDate = full?.eventDate;
    return Boolean(eventDate && eventDate >= week && eventDate <= weekEnd);
  });
  await prisma.post.create({
    data: {
      boardType: "SCHEDULE",
      title: weeklyHubTitle(week),
      content: weeklyHubContent(
        weekEvents.map((post) => {
          const row = catalog.schedule.find((item) => item.title === post.title);
          return { title: post.title, eventDate: row?.eventDate, promoLocation: row?.promoLocation };
        }),
      ),
      authorId: dealer.id,
      eventDate: week,
      eventEndDate: weekEnd,
      promoLocation: "전국 홀덤",
      isPaid: true,
    },
  });
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
        kind: `MARK:${dealer.id}:dealer`,
        message: `🎰 ${dealer.nickname}님이 마크 상점에서 [딜러 스타]를 구매하셨습니다!`,
        href: "/shop",
      },
      {
        kind: `POST:${handReview?.id ?? "hand"}`,
        message: `📝 ${dealer.nickname}님이 [핸드리뷰]에 글을 남겼습니다 — ${handReview?.title.slice(0, 28) ?? "오늘의 핸드"}`,
        href: handReview ? `/posts/${handReview.id}` : "/boards/hand-review",
      },
      {
        kind: `WEEKLY_HAND:${week}`,
        message: `♠️ ${dealer.nickname}님의 핸드리뷰가 주간 최고의 분석글로 선정되어 +${WEEKLY_HAND_EXP.toLocaleString()} EXP를 획득하셨습니다!`,
        href: "/boards/hand-review",
      },
    ],
  });

  console.log(`Seed complete. posts=${createdPosts.length} attendance=5`);
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
