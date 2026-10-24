import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { grantRewards } from "@/lib/exp";
import { publicErrorMessage } from "@/lib/public-error";
import { todayKstDate } from "@/lib/dates";
import { ACCEPT_EXP, ACCEPT_PAIR_DAYS, ACCEPT_POINTS, acceptRewarded, canAccept } from "@/lib/accept-answer";

/**
 * 좋은 답변 채택(글쓴이만 · 글 하나에 하나 · 되돌리기 없음).
 * 답변자 보상은 하루 ACCEPT_DAILY_MAX번 · 같은 글쓴이 → 같은 답변자는 ACCEPT_PAIR_DAYS일에 한 번(넘으면 채택 표시만).
 */
export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "로그인된 회원이 없습니다." }, { status: 401 });
    const { id } = await context.params;
    const comment = await prisma.comment.findUnique({
      where: { id },
      select: { id: true, authorId: true, acceptedAt: true, isAttendanceCheck: true, post: { select: { id: true, authorId: true, boardType: true, hidden: true } } },
    });
    if (!comment?.post || comment.isAttendanceCheck) return NextResponse.json({ error: "댓글을 찾을 수 없습니다." }, { status: 404 });
    const post = comment.post;
    if (post.hidden) return NextResponse.json({ error: "숨김 처리된 글입니다." }, { status: 403 });
    const already = await prisma.comment.count({ where: { postId: post.id, acceptedAt: { not: null } } });
    const check = canAccept({
      viewerId: user.id,
      postAuthorId: post.authorId,
      boardType: post.boardType,
      commentAuthorId: comment.authorId,
      alreadyAccepted: already > 0,
    });
    if (!check.ok) return NextResponse.json({ error: check.error }, { status: 400 });
    const answererId = comment.authorId as string;

    const now = new Date();
    const dayStart = new Date(`${todayKstDate()}T00:00:00+09:00`);
    const [answererAcceptsToday, samePair] = await Promise.all([
      prisma.comment.count({ where: { authorId: answererId, acceptedAt: { gte: dayStart } } }),
      prisma.comment.count({
        where: {
          authorId: answererId,
          acceptedAt: { gte: new Date(now.getTime() - ACCEPT_PAIR_DAYS * 86_400_000) },
          post: { authorId: user.id },
        },
      }),
    ]);

    // 동시에 두 번 눌러도 하나만: 부분 유니크 인덱스(글당 채택 하나)가 두 번째를 막음
    try {
      await prisma.comment.update({ where: { id: comment.id }, data: { acceptedAt: now } });
    } catch {
      return NextResponse.json({ error: "이미 채택한 답변이 있어요(글 하나에 하나만)." }, { status: 409 });
    }

    const rewarded = acceptRewarded({ answererAcceptsToday, samePairRecently: samePair > 0 });
    const reward = rewarded ? await grantRewards(answererId, ACCEPT_EXP, ACCEPT_POINTS, { ignorePointCap: true }) : null;
    return NextResponse.json({ ok: true, rewarded, points: reward?.grantedPoints ?? 0 });
  } catch (error) {
    return NextResponse.json({ error: publicErrorMessage(error, "채택에 실패했습니다.") }, { status: 500 });
  }
}
