"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function VerifyToggle({
  nickname,
  verified,
}: {
  nickname: string;
  verified: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function setVerified(next: boolean) {
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ nickname, verified: next }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "저장하지 못했습니다.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장하지 못했습니다.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={() => void setVerified(!verified)}
        className={
          verified
            ? "inline-flex min-h-10 items-center rounded-full border border-amber-300 bg-amber-50 px-3 text-sm font-semibold text-amber-900 hover:bg-amber-100 disabled:opacity-60"
            : "inline-flex min-h-10 items-center rounded-full border border-border bg-card px-3 text-sm font-semibold text-foreground hover:bg-muted disabled:opacity-60"
        }
      >
        {pending ? "저장 중…" : verified ? "인증 해제" : "인증 달기"}
      </button>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
