import { prisma } from "@/lib/db";
import { todayKstDate, yesterdayKstDate } from "@/lib/dates";
import { grantRewards } from "@/lib/exp";
import { AUTHOR_SELECT } from "@/components/posts/author-chip";
import { PAGE_SIZE } from "@/lib/feed";
import {
  ATTENDANCE_EXP,
  ATTENDANCE_MIN_COMMENT_LENGTH,
  ATTENDANCE_POINTS,
  streakBonusFor,
} from "@/lib/rewards";

export async function ensureTodayAttendancePost() {
  const date = todayKstDate();
  const existing = await prisma.post.findUnique({ where: { attendanceDate: date } });
  if (existing) return existing;

  try {
    return await prisma.post.create({
      data: {
        boardType: "FREE",
        title: `${date} 오늘의 출석체크`,
        content:
          "스팸 클릭을 막기 위해 이 글에 댓글을 남기면 출석으로 인정합니다. 하루 한 번만 가능합니다.",
        isAttendanceThread: true,
        attendanceDate: date,
        authorId: null,
      },
    });
  } catch {
    const raced = await prisma.post.findUnique({ where: { attendanceDate: date } });
    if (!raced) throw new Error("출석 게시글을 만들 수 없습니다.");
    return raced;
  }
}

export async function checkInAttendance(userId: string, message: string) {
  const content = message.trim();
  if (content.length < ATTENDANCE_MIN_COMMENT_LENGTH) {
    throw new Error(`출석 댓글은 ${ATTENDANCE_MIN_COMMENT_LENGTH}자 이상 적어 주세요.`);
  }

  const date = todayKstDate();
  const post = await ensureTodayAttendancePost();
  const already = await prisma.dailyAttendance.findUnique({
    where: { userId_date: { userId, date } },
  });
  if (already) {
    throw new Error("오늘은 이미 출석했습니다.");
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("회원을 찾을 수 없습니다.");

  const streak =
    user.lastAttendanceDate === yesterdayKstDate(date) ? user.attendanceStreak + 1 : 1;

  const comment = await prisma.comment.create({
    data: {
      postId: post.id,
      authorId: userId,
      content,
      isAttendanceCheck: true,
    },
  });

  try {
    await prisma.dailyAttendance.create({
      data: {
        userId,
        date,
        postId: post.id,
        commentId: comment.id,
      },
    });
  } catch {
    await prisma.comment.delete({ where: { id: comment.id } });
    throw new Error("오늘은 이미 출석했습니다.");
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      lastAttendanceDate: date,
      attendanceStreak: streak,
    },
  });
  await grantRewards(userId, ATTENDANCE_EXP, ATTENDANCE_POINTS);
  const bonus = streakBonusFor(streak);
  if (bonus) {
    await grantRewards(userId, bonus.exp, bonus.points, { ignorePointCap: true });
  }

  const todayCount = await prisma.dailyAttendance.count({ where: { date } });
  const { pushTicker } = await import("@/lib/ticker");
  if (bonus) {
    await pushTicker({
      kind: `STREAK:${userId}:${date}`,
      message: `🔥 ${user.nickname}님이 ${bonus.label} 출석! 보너스 ${bonus.points.toLocaleString()}P · EXP ${bonus.exp}`,
      href: "/attendance",
    });
  }
  if (todayCount === 1 || todayCount === 7 || todayCount === 10) {
    await pushTicker({
      kind: `LUCKY:${date}:${userId}`,
      message: `🎁 ${user.nickname}님이 오늘 ${todayCount}번째 출석자입니다!`,
      href: "/attendance",
    });
  }

  return {
    date,
    streak,
    exp: ATTENDANCE_EXP + (bonus?.exp ?? 0),
    points: ATTENDANCE_POINTS + (bonus?.points ?? 0),
    bonus,
    postId: post.id,
  };
}

export async function getAttendanceStats(userId?: string) {
  const date = todayKstDate();
  const post = await ensureTodayAttendancePost();
  const [todayCount, mine, comments] = await Promise.all([
    prisma.dailyAttendance.count({ where: { date } }),
    userId
      ? prisma.dailyAttendance.findUnique({
          where: { userId_date: { userId, date } },
        })
      : Promise.resolve(null),
    prisma.comment.findMany({
      where: { postId: post.id, isAttendanceCheck: true },
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
      include: { author: { select: AUTHOR_SELECT } },
    }),
  ]);

  const user = userId ? await prisma.user.findUnique({ where: { id: userId } }) : null;

  return {
    date,
    post,
    todayCount,
    alreadyCheckedIn: Boolean(mine),
    myStreak: user?.attendanceStreak ?? 0,
    lastAttendanceDate: user?.lastAttendanceDate ?? null,
    comments,
  };
}
