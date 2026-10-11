"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CrownIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

/** 운영진 전용. 공고를 목록 맨 위 프리미엄으로 고정하거나 해제합니다. */
export function PremiumToggle({ postId, isPaid }: { postId: string; isPaid: boolean }) {
  const router = useRouter();
  const [paid, setPaid] = useState(isPaid);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/posts/${postId}/paid`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPaid: !paid }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "처리에 실패했습니다.");
      setPaid(!paid);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "처리에 실패했습니다.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-[#c9a25c]/50 p-2 text-sm">
      <span className="text-xs text-[#9CA3AF]">운영진</span>
      <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => void toggle()}>
        <CrownIcon className="size-3.5" />
        {pending ? "처리 중…" : paid ? "프리미엄 고정 해제" : "프리미엄 상단 고정"}
      </Button>
      {error ? <span className="text-destructive">{error}</span> : null}
    </div>
  );
}
