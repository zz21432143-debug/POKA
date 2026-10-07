import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";
import { POLL_CHOICES, type PollChoice } from "@/lib/poll";

const IDS = POLL_CHOICES.map((choice) => choice.id);

async function countsFor(postId: string) {
  const rows = await prisma.handPollVote.groupBy({
    by: ["choice"],
    where: { postId },
    _count: { _all: true },
  });
  const counts: Record<string, number> = {};
  for (const id of IDS) counts[id] = 0;
  for (const row of rows) counts[row.choice] = row._count._all;
  return counts;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const user = await getCurrentUser().catch(() => null);
  const mine = user
    ? await prisma.handPollVote.findUnique({
        where: { postId_userId: { postId: id, userId: user.id } },
      })
    : null;
  return NextResponse.json({ counts: await countsFor(id), myChoice: mine?.choice ?? null });
}

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
    const body = (await request.json()) as { choice?: string };
    const choice = body.choice as PollChoice | undefined;
    if (!choice || !IDS.includes(choice)) {
      return NextResponse.json({ error: "폴드 / 체크 / 콜 / 레이즈 중 고르세요." }, { status: 400 });
    }
    const post = await prisma.post.findUnique({ where: { id }, select: { boardType: true } });
    if (!post || post.boardType !== "HAND_REVIEW") {
      return NextResponse.json({ error: "핸드리뷰에서만 투표할 수 있습니다." }, { status: 400 });
    }
    await prisma.handPollVote.upsert({
      where: { postId_userId: { postId: id, userId: user.id } },
      create: { postId: id, userId: user.id, choice },
      update: { choice },
    });
    return NextResponse.json({ counts: await countsFor(id), myChoice: choice });
  } catch (error) {
    const message = error instanceof Error ? error.message : "투표에 실패했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
