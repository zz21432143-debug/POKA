import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { jobStatus } from "@/lib/job-status";
import { assertAccountActive, AccountRestrictedError } from "@/lib/account-restriction";
import { ForbiddenWordError, assertNoForbiddenWordsInJob } from "@/lib/forbidden-words";
import { publicErrorMessage } from "@/lib/public-error";

const MAX_MESSAGE = 500;

async function loadJob(id: string) {
  return prisma.post.findUnique({
    where: { id },
    select: {
      id: true,
      boardType: true,
      hidden: true,
      authorId: true,
      jobKind: true,
      jobFilled: true,
      jobAlwaysOpen: true,
      jobWorkDate: true,
      jobEndDate: true,
      jobDeadline: true,
      createdAt: true,
    },
  });
}

/** 구인 공고에 지원합니다. 한 공고에 한 번, 모집중인 공고만. */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "로그인 후 지원할 수 있습니다." }, { status: 401 });
    }
    await assertAccountActive(user);
    const { id } = await context.params;
    const post = await loadJob(id);
    if (!post || post.boardType !== "JOBS" || post.hidden || !post.jobKind || post.jobKind === "SEEKING") {
      return NextResponse.json({ error: "지원할 수 있는 공고가 아닙니다." }, { status: 404 });
    }
    if (post.authorId === user.id) {
      return NextResponse.json({ error: "내 공고에는 지원할 수 없습니다." }, { status: 400 });
    }
    if (jobStatus(post) !== "open") {
      return NextResponse.json({ error: "마감된 공고입니다." }, { status: 400 });
    }
    const body = (await request.json().catch(() => ({}))) as { message?: unknown };
    const message = typeof body.message === "string" ? body.message.trim().slice(0, MAX_MESSAGE) : "";
    await assertNoForbiddenWordsInJob(message);
    const existing = await prisma.jobApplication.findUnique({
      where: { postId_applicantId: { postId: id, applicantId: user.id } },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json({ error: "이미 지원한 공고입니다." }, { status: 409 });
    }
    await prisma.jobApplication.create({
      data: { postId: id, applicantId: user.id, message: message || null },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AccountRestrictedError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof ForbiddenWordError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    const message = publicErrorMessage(error, "지원에 실패했습니다.");
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** 지원 취소 */
export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "로그인된 회원이 없습니다." }, { status: 401 });
    }
    const { id } = await context.params;
    await prisma.jobApplication.deleteMany({ where: { postId: id, applicantId: user.id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = publicErrorMessage(error, "취소에 실패했습니다.");
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
