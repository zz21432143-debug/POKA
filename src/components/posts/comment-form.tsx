"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatRewardLine } from "@/lib/rewards";

export function CommentForm({
  postId,
  submitLabel,
  placeholder,
  disabled = false,
  disabledReason,
}: {
  postId: string;
  submitLabel: string;
  placeholder: string;
  disabled?: boolean;
  disabledReason?: string;
}) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [granted, setGranted] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit() {
    setPending(true);
    setError(null);
    setGranted(null);
    try {
      const response = await fetch(`/api/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const payload = (await response.json()) as {
        error?: string;
        attendance?: boolean;
        exp?: number;
        points?: number;
      };
      if (!response.ok) {
        throw new Error(payload.error ?? "작성에 실패했습니다.");
      }
      setContent("");
      if (!payload.attendance && typeof payload.points === "number") {
        setGranted(
          payload.points > 0
            ? `${formatRewardLine(payload.exp ?? 0, payload.points)}가 지급되었습니다.`
            : "오늘 글·댓글 포인트 한도에 도달해 경험치만 지급되었습니다.",
        );
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "작성에 실패했습니다.");
    } finally {
      setPending(false);
    }
  }

  if (disabled) {
    return (
      <p className="rounded-xl border border-[#3a332c] bg-[#141110] px-3 py-3 text-sm text-[#D1D5DB]">
        {disabledReason ?? "지금은 작성할 수 없습니다."}
      </p>
    );
  }

  return (
    <div className="grid gap-2">
      <Textarea
        value={content}
        onChange={(event) => setContent(event.target.value)}
        placeholder={placeholder}
        className="ink-field min-h-24"
      />
      {error ? <p className="text-sm font-medium text-destructive">{error}</p> : null}
      {granted ? (
        <p className="rounded-lg border border-[#C59B27]/40 bg-[#2a2218] px-3 py-2 text-sm font-medium text-[#C59B27]">
          {granted}
        </p>
      ) : null}
      <Button type="button" size="touch" disabled={pending} onClick={submit} className="w-full sm:w-auto">
        {pending ? "등록 중…" : submitLabel}
      </Button>
    </div>
  );
}
