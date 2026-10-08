"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { REPORT_REASONS } from "@/lib/report-reasons";
import { FlagIcon } from "lucide-react";

export function ReportButton({
  targetType,
  targetId,
  compact = false,
  look = "text",
}: {
  targetType: "post" | "comment";
  targetId: string;
  compact?: boolean;
  look?: "text" | "pill";
}) {
  const [preset, setPreset] = useState<(typeof REPORT_REASONS)[number]>("스팸");
  const [detail, setDetail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit() {
    setPending(true);
    setMessage(null);
    const reason = preset === "기타" ? detail.trim() : detail.trim() ? `${preset}: ${detail.trim()}` : preset;
    if (reason.length < 2) {
      setMessage("신고 사유를 입력하세요.");
      return;
    }
    const path =
      targetType === "post" ? `/api/posts/${targetId}/report` : `/api/comments/${targetId}/report`;
    try {
      const response = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "신고에 실패했습니다.");
      setMessage("신고가 접수되었습니다. 관리자가 확인합니다.");
      setDetail("");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "신고에 실패했습니다.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <Dialog>
        <DialogTrigger
          type="button"
          className={
            look === "pill"
              ? "vote-pill vote-report"
              : compact
                ? "ink-btn inline-flex min-h-9 items-center rounded-full px-3 text-xs font-semibold"
                : "ink-btn inline-flex h-11 items-center justify-center rounded-xl px-4 text-sm font-semibold"
          }
        >
          {look === "pill" ? <FlagIcon /> : null}
          신고
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{targetType === "post" ? "게시글 신고" : "댓글 신고"}</DialogTitle>
            <DialogDescription>
              허위 신고는 제재 대상입니다. 사유를 고른 뒤 필요하면 설명을 보태 주세요.
            </DialogDescription>
          </DialogHeader>
          <ul className="grid gap-2">
            {REPORT_REASONS.map((item) => (
              <li key={item}>
                <label className="flex min-h-11 items-center gap-2 rounded-xl border border-border px-3 text-sm">
                  <input
                    type="radio"
                    name={`report-${targetType}-${targetId}`}
                    checked={preset === item}
                    onChange={() => setPreset(item)}
                  />
                  {item}
                </label>
              </li>
            ))}
          </ul>
          <Textarea
            value={detail}
            onChange={(event) => setDetail(event.target.value)}
            placeholder={preset === "기타" ? "신고 사유를 적어 주세요" : "추가 설명 (선택)"}
            className="min-h-20"
          />
          <Button type="button" size="touch" disabled={pending} onClick={() => void submit()}>
            {pending ? "접수 중…" : "신고 제출"}
          </Button>
        </DialogContent>
      </Dialog>
      {message ? <p className="text-xs text-muted-foreground">{message}</p> : null}
    </div>
  );
}
