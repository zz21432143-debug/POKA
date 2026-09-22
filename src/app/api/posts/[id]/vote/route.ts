import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { grantRewards } from "@/lib/exp";
import { UPVOTE_RECEIVED_EXP, UPVOTE_RECEIVED_POINTS } from "@/lib/rewards";

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
    const body = (await request.json()) as { value?: number };
    const value = body.value === -1 ? -1 : 1;

    const post = await prisma.post.findUnique({ where: { id } });
    if (!post) {
      return NextResponse.json({ error: "게시글을 찾을 수 없습니다." }, { status: 404 });
    }
    if (post.authorId === user.id) {
      return NextResponse.json({ error: "내 글에는 추천할 수 없습니다." }, { status: 400 });
    }

    const existing = await prisma.postVote.findUnique({
      where: { postId_userId: { postId: id, userId: user.id } },
    });

    if (existing?.value === value) {
      return NextResponse.json({
        upvoteCount: post.upvoteCount,
        downvoteCount: post.downvoteCount,
        myVote: value,
      });
    }

    let upvoteCount = post.upvoteCount;
    let downvoteCount = post.downvoteCount;
    if (existing) {
      if (existing.value === 1) upvoteCount -= 1;
      if (existing.value === -1) downvoteCount -= 1;
    }
    if (value === 1) upvoteCount += 1;
    if (value === -1) downvoteCount += 1;

    await prisma.$transaction([
      existing
        ? prisma.postVote.update({
            where: { id: existing.id },
            data: { value },
          })
        : prisma.postVote.create({
            data: { postId: id, userId: user.id, value },
          }),
      prisma.post.update({
        where: { id },
        data: { upvoteCount, downvoteCount },
      }),
    ]);

    const newlyUpvoted = value === 1 && existing?.value !== 1;
    if (newlyUpvoted && post.authorId) {
      await grantRewards(post.authorId, UPVOTE_RECEIVED_EXP, UPVOTE_RECEIVED_POINTS);
      const { maybePopularPost } = await import("@/lib/ticker");
      await maybePopularPost(id);
    }

    return NextResponse.json({ upvoteCount, downvoteCount, myVote: value });
  } catch (error) {
    const message = error instanceof Error ? error.message : "추천에 실패했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
