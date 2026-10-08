"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export type ReportAdminRow = {
  id: string;
  reason: string;
  status: string;
  targetType: string;
  reporter: string;
  reporterIp: string | null;
  postId: string | null;
  title: string;
  commentPreview: string | null;
  authorId: string | null;
  authorIp: string | null;
  hidden: boolean;
};

export function ReportAdmin({ reports }: { reports: ReportAdminRow[] }) {
  const router = useRouter();

  async function act(reportId: string, action: "resolve" | "dismiss" | "delete" | "suspend-author") {
    await fetch("/api/admin/reports", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reportId, action }),
    });
    router.refresh();
  }

  if (reports.length === 0) {
    return <p className="text-sm text-muted-foreground">접수된 신고가 없습니다.</p>;
  }

  return (
    <ul className="grid gap-3">
      {reports.map((row) => (
        <li key={row.id} className="rounded-xl border border-border bg-card p-3 text-sm">
          <p className="break-words font-medium">
            {row.targetType === "comment" ? "댓글" : "게시글"} · {row.title}
          </p>
          {row.commentPreview ? (
            <p className="mt-1 break-words rounded-lg bg-muted px-2 py-1 text-xs">{row.commentPreview}</p>
          ) : null}
          <p className="mt-1 text-muted-foreground">{row.reason}</p>
          <p className="mt-2 font-mono text-xs">
            작성자 {row.authorId ?? "—"} / IP {row.authorIp ?? "—"}
          </p>
          <p className="font-mono text-xs">
            신고자 {row.reporter} / IP {row.reporterIp ?? "—"} · {row.status}
            {row.hidden ? " · 숨김됨" : ""}
          </p>
          {row.postId ? (
            <a href={`/posts/${row.postId}`} className="mt-1 inline-block text-xs text-primary">
              대상 글 보기
            </a>
          ) : null}
          <div className="mt-2 flex flex-wrap gap-2">
            <Button type="button" size="touch" variant="outline" onClick={() => void act(row.id, "delete")}>
              게시물 삭제
            </Button>
            <Button type="button" size="touch" onClick={() => void act(row.id, "resolve")}>
              처리 완료
            </Button>
            <Button type="button" size="touch" variant="ghost" onClick={() => void act(row.id, "dismiss")}>
              신고 기각
            </Button>
            {row.authorId ? (
              <Button
                type="button"
                size="touch"
                variant="outline"
                onClick={() => void act(row.id, "suspend-author")}
              >
                작성자 정지
              </Button>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}
