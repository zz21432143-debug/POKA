import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { writeAudit } from "@/lib/security";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;
  const reports = await prisma.report.findMany({
    orderBy: { createdAt: "desc" },
    take: 80,
    include: {
      post: { select: { id: true, title: true, authorId: true, authorIp: true, hidden: true } },
      comment: { select: { id: true, content: true, authorId: true, authorIp: true, postId: true } },
      reporter: { select: { nickname: true } },
    },
  });
  return NextResponse.json({ reports });
}

export async function PATCH(request: Request) {
  const { user, error } = await requireAdmin();
  if (error || !user) return error;
  const body = (await request.json()) as {
    reportId?: string;
    postId?: string;
    action?: "resolve" | "dismiss" | "delete" | "hide" | "restore" | "suspend-author" | "rename-author";
  };

  if (body.reportId) {
    const report = await prisma.report.findUnique({ where: { id: body.reportId } });
    if (!report) {
      return NextResponse.json({ error: "신고를 찾을 수 없습니다." }, { status: 404 });
    }
    if (body.action === "dismiss") {
      await prisma.report.update({ where: { id: report.id }, data: { status: "dismissed" } });
      await writeAudit({
        kind: "REPORT_DISMISS",
        userId: user.id,
        ip: "admin",
        postId: report.postId,
        detail: report.id,
      });
      return NextResponse.json({ ok: true, status: "dismissed" });
    }
    if (body.action === "resolve") {
      await prisma.report.update({ where: { id: report.id }, data: { status: "resolved" } });
      await writeAudit({
        kind: "REPORT_RESOLVE",
        userId: user.id,
        ip: "admin",
        postId: report.postId,
        detail: report.id,
      });
      return NextResponse.json({ ok: true, status: "resolved" });
    }
    // 부적절한 닉네임 신고: 작성자 닉네임을 바른닉네임○○○○로(변경권 1장 · 안내 · 기록)
    if (body.action === "rename-author") {
      const authorId =
        report.targetType === "comment" && report.commentId
          ? (await prisma.comment.findUnique({ where: { id: report.commentId }, select: { authorId: true } }))?.authorId
          : report.postId
            ? (await prisma.post.findUnique({ where: { id: report.postId }, select: { authorId: true } }))?.authorId
            : null;
      const author = authorId ? await prisma.user.findUnique({ where: { id: authorId }, select: { nickname: true } }) : null;
      if (!author) return NextResponse.json({ error: "작성자를 찾을 수 없습니다." }, { status: 404 });
      const { forceNicknameChange } = await import("@/lib/nickname-force");
      const done = await forceNicknameChange(author.nickname, "profanity", user.id, "admin");
      if (!done.ok) return NextResponse.json({ error: done.error }, { status: 400 });
      await prisma.report.update({ where: { id: report.id }, data: { status: "resolved" } });
      return NextResponse.json({ ok: true, status: "resolved", from: done.from, to: done.to });
    }
    if (body.action === "suspend-author") {
      const authorId =
        report.targetType === "comment" && report.commentId
          ? (await prisma.comment.findUnique({ where: { id: report.commentId }, select: { authorId: true } }))
              ?.authorId
          : report.postId
            ? (await prisma.post.findUnique({ where: { id: report.postId }, select: { authorId: true } }))?.authorId
            : null;
      if (!authorId) {
        return NextResponse.json({ error: "작성자를 찾을 수 없습니다." }, { status: 404 });
      }
      const author = await prisma.user.findUnique({ where: { id: authorId } });
      if (!author) {
        return NextResponse.json({ error: "작성자를 찾을 수 없습니다." }, { status: 404 });
      }
      if (author.isMaster) {
        return NextResponse.json({ error: "마스터 계정은 제재할 수 없습니다." }, { status: 403 });
      }
      await prisma.user.update({
        where: { id: author.id },
        data: {
          status: "SUSPENDED",
          suspendedUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          banReason: `신고 처리: ${report.reason.slice(0, 80)}`,
        },
      });
      await prisma.report.update({ where: { id: report.id }, data: { status: "resolved" } });
      await writeAudit({
        kind: "REPORT_SUSPEND_AUTHOR",
        userId: user.id,
        ip: "admin",
        postId: report.postId,
        detail: author.nickname,
      });
      return NextResponse.json({ ok: true, status: "resolved", suspended: true });
    }
    if (body.action === "delete") {
      if (report.targetType === "comment" && report.commentId) {
        await prisma.comment.delete({ where: { id: report.commentId } }).catch(() => undefined);
      } else if (report.postId) {
        await prisma.post.update({ where: { id: report.postId }, data: { hidden: true } });
      }
      await prisma.report.update({ where: { id: report.id }, data: { status: "resolved" } });
      await writeAudit({
        kind: "ADMIN_DELETE",
        userId: user.id,
        ip: "admin",
        postId: report.postId,
        detail: report.id,
      });
      return NextResponse.json({ ok: true, status: "resolved", deleted: true });
    }
  }

  if (!body.postId) {
    return NextResponse.json({ error: "reportId 또는 postId가 필요합니다." }, { status: 400 });
  }
  const hidden = body.action !== "restore";
  await prisma.post.update({ where: { id: body.postId }, data: { hidden } });
  await prisma.report.updateMany({
    where: { postId: body.postId },
    data: { status: hidden ? "resolved" : "dismissed" },
  });
  await writeAudit({
    kind: hidden ? "ADMIN_HIDE" : "ADMIN_RESTORE",
    userId: user.id,
    ip: "admin",
    postId: body.postId,
  });
  return NextResponse.json({ ok: true, hidden });
}
