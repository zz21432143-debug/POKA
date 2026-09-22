"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

type Row = {
  id: string;
  reason: string;
  status: string;
  reporter: string;
  reporterIp: string | null;
  postId: string;
  title: string;
  authorId: string | null;
  authorIp: string | null;
  hidden: boolean;
};

export function ReportAdmin({ reports }: { reports: Row[] }) {
  const router = useRouter();

  async function act(postId: string, action: "hide" | "restore") {
    await fetch("/api/admin/reports", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postId, action }),
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
          <p className="font-medium">{row.title}</p>
          <p className="mt-1 text-muted-foreground">{row.reason}</p>
          <p className="mt-2 font-mono text-xs">
            작성자 {row.authorId ?? "—"} / IP {row.authorIp ?? "—"}
          </p>
          <p className="font-mono text-xs">
            신고자 {row.reporter} / IP {row.reporterIp ?? "—"} · {row.status}
          </p>
          <div className="mt-2 flex gap-2">
            <Button type="button" size="touch" variant="outline" onClick={() => act(row.postId, "hide")}>
              숨김
            </Button>
            <Button type="button" size="touch" variant="ghost" onClick={() => act(row.postId, "restore")}>
              복구
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}
