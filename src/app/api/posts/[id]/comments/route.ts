import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { grantRewards } from "@/lib/exp";
import { COMMENT_EXP, COMMENT_POINTS } from "@/lib/rewards";
import { checkInAttendance } from "@/lib/attendance";
import { clientIp } from "@/lib/request";
import { CoolDownError, assertWriteCooldown } from "@/lib/security";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "로그인된 회원이 없습니다." }, { status: 401 });
    }

    const { id } = await context.params;
    const body = (await request.json()) as { content?: string };
    const content = body.content?.trim() ?? "";
    if (content.length < 1) {
      return NextResponse.json({ error: "댓글 내용을 입력하세요." }, { status: 400 });
    }

    const post = await prisma.post.findUnique({ where: { id } });
    if (!post) {
      return NextResponse.json({ error: "게시글을 찾을 수 없습니다." }, { status: 404 });
    }
    if (post.hidden) {
      return NextResponse.json({ error: "숨김 처리된 글입니다." }, { status: 403 });
    }
    if (post.boardType === "ANONYMOUS_REVIEW") {
      return NextResponse.json({ error: "익명 게시판은 운영을 종료했습니다." }, { status: 403 });
    }

    if (post.isAttendanceThread) {
      const result = await checkInAttendance(user.id, content);
      return NextResponse.json({ attendance: true, ...result });
    }

    const ip = clientIp(request);
    await assertWriteCooldown({
      kind: "comment",
      userId: user.id,
      ip,
      isAdmin: user.isAdmin,
    });

    const comment = await prisma.comment.create({
      data: {
        postId: post.id,
        authorId: user.id,
        content,
        isAttendanceCheck: false,
      },
    });
    await grantRewards(user.id, COMMENT_EXP, COMMENT_POINTS);
    await prisma.user.update({ where: { id: user.id }, data: { lastCommentAt: new Date() } });
    return NextResponse.json({ id: comment.id, exp: COMMENT_EXP });
  } catch (error) {
    if (error instanceof CoolDownError) {
      return NextResponse.json(
        { error: error.message },
        { status: 429, headers: { "Retry-After": String(error.retryAfterSec) } },
      );
    }
    const message = error instanceof Error ? error.message : "댓글 작성에 실패했습니다.";
    const status = message.includes("이미 출석") ? 409 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
