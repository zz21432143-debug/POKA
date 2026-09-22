import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { clientIp } from "@/lib/request";
import {
  CoolDownError,
  REPORT_HIDE_THRESHOLD,
  assertWriteCooldown,
  writeAudit,
} from "@/lib/security";

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
    const body = (await request.json()) as { reason?: string };
    const reason = body.reason?.trim() ?? "";
    if (reason.length < 2) {
      return NextResponse.json({ error: "신고 사유를 입력하세요." }, { status: 400 });
    }

    const post = await prisma.post.findUnique({ where: { id } });
    if (!post) {
      return NextResponse.json({ error: "게시글을 찾을 수 없습니다." }, { status: 404 });
    }
    if (post.boardType !== "ANONYMOUS_REVIEW") {
      return NextResponse.json({ error: "익명 게시판만 신고할 수 있습니다." }, { status: 400 });
    }
    if (post.authorId === user.id) {
      return NextResponse.json({ error: "내 글은 신고할 수 없습니다." }, { status: 400 });
    }

    const ip = clientIp(request);
    await assertWriteCooldown({
      kind: "report",
      userId: user.id,
      ip,
      isAdmin: user.isAdmin,
    });
    try {
      await prisma.report.create({
        data: { postId: id, reporterId: user.id, reason, reporterIp: ip, status: "PENDING" },
      });
    } catch {
      return NextResponse.json({ error: "이미 신고한 글입니다." }, { status: 409 });
    }

    await writeAudit({
      kind: "REPORT",
      userId: user.id,
      ip,
      postId: id,
      detail: reason.slice(0, 200),
    });

    const count = await prisma.report.count({ where: { postId: id } });
    if (count >= REPORT_HIDE_THRESHOLD && !post.hidden) {
      await prisma.post.update({ where: { id }, data: { hidden: true } });
      await prisma.report.updateMany({ where: { postId: id }, data: { status: "HIDDEN" } });
      await writeAudit({
        kind: "AUTO_HIDE",
        userId: user.id,
        ip,
        postId: id,
        detail: `신고 ${count}건으로 숨김`,
      });
    }

    return NextResponse.json({ ok: true, count, hidden: count >= REPORT_HIDE_THRESHOLD });
  } catch (error) {
    if (error instanceof CoolDownError) {
      return NextResponse.json(
        { error: error.message },
        { status: 429, headers: { "Retry-After": String(error.retryAfterSec) } },
      );
    }
    const message = error instanceof Error ? error.message : "신고에 실패했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
