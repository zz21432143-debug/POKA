import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";
import { ReportAdmin } from "@/components/admin/report-admin";

export const dynamic = "force-dynamic";

export default async function AdminReportsPage() {
  const user = await getCurrentUser();
  if (!user?.isAdmin) notFound();
  const reports = await prisma.report.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      post: { select: { id: true, title: true, authorId: true, authorIp: true, hidden: true } },
      reporter: { select: { nickname: true } },
    },
  });

  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-2xl font-semibold">매장후기 신고</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          작성자 계정/IP는 관리자에게만 보입니다. 3건 이상 신고 시 자동 숨김됩니다.
        </p>
      </header>
      <ReportAdmin
        reports={reports.map((row) => ({
          id: row.id,
          reason: row.reason,
          status: row.status,
          reporter: row.reporter.nickname,
          reporterIp: row.reporterIp,
          postId: row.post.id,
          title: row.post.title,
          authorId: row.post.authorId,
          authorIp: row.post.authorIp,
          hidden: row.post.hidden,
        }))}
      />
    </div>
  );
}
