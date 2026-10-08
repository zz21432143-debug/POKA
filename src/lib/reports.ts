import { prisma } from "@/lib/db";
import { writeAudit } from "@/lib/security";

export const REPORT_REASONS = ["스팸", "비방/욕설", "불법 홍보", "기타"] as const;

export type ReportTargetType = "post" | "comment";

export async function alreadyReported(opts: {
  reporterId: string;
  targetType: ReportTargetType;
  targetId: string;
}) {
  if (opts.targetType === "post") {
    const row = await prisma.report.findFirst({
      where: { reporterId: opts.reporterId, postId: opts.targetId },
    });
    return Boolean(row);
  }
  const row = await prisma.report.findFirst({
    where: { reporterId: opts.reporterId, commentId: opts.targetId },
  });
  return Boolean(row);
}

export async function createContentReport(opts: {
  reporterId: string;
  targetType: ReportTargetType;
  targetId: string;
  reason: string;
  ip: string;
}) {
  const reason = opts.reason.trim();
  if (reason.length < 2) throw new Error("신고 사유를 입력하세요.");

  if (opts.targetType === "post") {
    const post = await prisma.post.findUnique({ where: { id: opts.targetId } });
    if (!post) throw new Error("게시글을 찾을 수 없습니다.");
    if (post.authorId === opts.reporterId) throw new Error("내 글은 신고할 수 없습니다.");
    if (await alreadyReported(opts)) throw new Error("이미 신고한 대상입니다.");
    const report = await prisma.report.create({
      data: {
        reporterId: opts.reporterId,
        targetType: "post",
        postId: post.id,
        reason,
        reporterIp: opts.ip,
        status: "pending",
      },
    });
    await writeAudit({
      kind: "REPORT",
      userId: opts.reporterId,
      ip: opts.ip,
      postId: post.id,
      detail: reason.slice(0, 200),
    });
    return report;
  }

  const comment = await prisma.comment.findUnique({ where: { id: opts.targetId } });
  if (!comment) throw new Error("댓글을 찾을 수 없습니다.");
  if (comment.authorId === opts.reporterId) throw new Error("내 댓글은 신고할 수 없습니다.");
  if (await alreadyReported(opts)) throw new Error("이미 신고한 대상입니다.");
  const report = await prisma.report.create({
    data: {
      reporterId: opts.reporterId,
      targetType: "comment",
      commentId: comment.id,
      postId: comment.postId,
      reason,
      reporterIp: opts.ip,
      status: "pending",
    },
  });
  await writeAudit({
    kind: "REPORT_COMMENT",
    userId: opts.reporterId,
    ip: opts.ip,
    postId: comment.postId,
    detail: reason.slice(0, 200),
  });
  return report;
}
