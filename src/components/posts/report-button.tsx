"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function ReportButton({ postId }: { postId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit() {
    setPending(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/posts/${postId}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      const payload = (await response.json()) as { error?: string; count?: number };
      if (!response.ok) throw new Error(payload.error ?? "신고에 실패했습니다.");
      setMessage("신고가 접수되었습니다. 운영 확인용으로만 보관됩니다.");
      setOpen(false);
      setReason("");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "신고에 실패했습니다.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Button type="button" size="touch" variant="outline" onClick={() => setOpen((v) => !v)}>
        허위·분쟁 신고
      </Button>
      {open ? (
        <div className="rounded-xl border border-border bg-card p-3">
          <p className="mb-2 text-xs text-muted-foreground">
            작성자 계정과 IP는 게시글에 노출되지 않고 내부 DB에만 남습니다.
          </p>
          <Textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="허위 사실, 명예훼손 등 사유"
            className="min-h-20"
          />
          <Button type="button" size="touch" className="mt-2" disabled={pending} onClick={submit}>
            {pending ? "접수 중…" : "신고 제출"}
          </Button>
        </div>
      ) : null}
      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
    </div>
  );
}
