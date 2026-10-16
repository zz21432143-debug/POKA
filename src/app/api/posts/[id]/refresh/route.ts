import { after, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { ForbiddenWordError, assertNoForbiddenWordsInJob } from "@/lib/forbidden-words";
import { canBumpNow } from "@/lib/job-bump";
import { isStaff } from "@/lib/roles";
import { todayKstDate } from "@/lib/dates";

/**
 * 구인 공고 「붙여넣고 갱신」: 본문(카톡 일정)만 바꾸고 맨 위로(작성자는 하루 한 번 · 운영진은 언제든).
 * 글을 지우고 다시 올리지 않아도 최신으로 · 조회수 · 댓글은 그대로.
 */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "로그인해 주세요." }, { status: 401 });
  const { id } = await context.params;
  const post = await prisma.post.findUnique({ where: { id }, select: { id: true, authorId: true, boardType: true, hidden: true, title: true, bumpedAt: true, jobKind: true, jobDeadline: true } });
  if (!post || post.boardType !== "JOBS" || post.hidden) return NextResponse.json({ error: "구인 공고가 아니에요." }, { status: 404 });
  const staff = isStaff(user);
  if (post.authorId !== user.id && !staff) return NextResponse.json({ error: "작성자만 갱신할 수 있어요." }, { status: 403 });
  const body = (await request.json().catch(() => ({}))) as { content?: unknown };
  const content = typeof body.content === "string" ? body.content.trim() : "";
  if (content.length < 5) return NextResponse.json({ error: "새 일정을 붙여넣어 주세요." }, { status: 400 });
  if (content.length > 30_000) return NextResponse.json({ error: "본문은 30,000자까지 쓸 수 있어요." }, { status: 400 });
  try {
    await assertNoForbiddenWordsInJob(post.title, content);
  } catch (error) {
    if (error instanceof ForbiddenWordError) return NextResponse.json({ error: error.message }, { status: 400 });
    throw error;
  }
  const bump = staff || canBumpNow(post.bumpedAt);
  await prisma.post.update({
    where: { id },
    // 새 일정을 넣으면 다시 모집 중으로
    data: {
      content,
      jobFilled: false,
      ...(post.jobDeadline && post.jobDeadline < todayKstDate() ? { jobDeadline: null } : {}),
      ...(bump ? { bumpedAt: new Date() } : {}),
    },
  });
  // 그 지역 · 날짜에 「가능」을 등록한 딜러에게 알림(응답 뒤에)
  after(async () => {
    const { notifySlotWatchers } = await import("@/lib/job-board");
    await notifySlotWatchers(id).catch(() => undefined);
  });
  return NextResponse.json({ ok: true, bumped: bump });
}
