import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { grantRewards } from "@/lib/exp";
import { COMMENT_EXP, COMMENT_POINTS } from "@/lib/rewards";
import { checkInAttendance } from "@/lib/attendance";

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

    if (post.isAttendanceThread) {
      const result = await checkInAttendance(user.id, content);
      return NextResponse.json({ attendance: true, ...result });
    }

    const comment = await prisma.comment.create({
      data: {
        postId: post.id,
        authorId: user.id,
        content,
        isAttendanceCheck: false,
      },
    });
    await grantRewards(user.id, COMMENT_EXP, COMMENT_POINTS);
    return NextResponse.json({ id: comment.id, exp: COMMENT_EXP });
  } catch (error) {
    const message = error instanceof Error ? error.message : "댓글 작성에 실패했습니다.";
    const status = message.includes("이미 출석") ? 409 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
