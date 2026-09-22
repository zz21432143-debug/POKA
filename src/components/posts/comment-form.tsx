"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

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
  const [pending, setPending] = useState(false);

  async function submit() {
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "작성에 실패했습니다.");
      }
      setContent("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "작성에 실패했습니다.");
    } finally {
      setPending(false);
    }
  }

  if (disabled) {
    return (
      <p className="rounded-xl border border-border bg-card px-3 py-3 text-sm text-muted-foreground">
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
        className="min-h-24"
      />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="button" size="touch" disabled={pending} onClick={submit} className="w-full sm:w-auto">
        {pending ? "등록 중…" : submitLabel}
      </Button>
    </div>
  );
}
