"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

type Slot = {
  slot: number;
  mode: string;
  enabled: boolean;
  postId: string | null;
  post: { id: string; title: string } | null;
};

type Promo = { id: string; title: string; isPaid: boolean };

export function BannerAdmin({
  slots,
  promo,
}: {
  slots: Slot[];
  promo: Promo[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<number | null>(null);

  async function save(slot: number, patch: Record<string, unknown>) {
    setPending(slot);
    setError(null);
    try {
      const response = await fetch("/api/admin/banners", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slot, ...patch }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "저장 실패");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장 실패");
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <ul className="grid gap-3">
        {slots.map((slot) => (
          <li key={slot.slot} className="rounded-xl border border-border bg-card p-3">
            <p className="font-medium">구좌 {slot.slot}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Button
                type="button"
                size="touch"
                variant={slot.mode === "AUTO" ? "default" : "outline"}
                disabled={pending === slot.slot}
                onClick={() => save(slot.slot, { mode: "AUTO" })}
              >
                자동
              </Button>
              <Button
                type="button"
                size="touch"
                variant={slot.mode === "MANUAL" ? "default" : "outline"}
                disabled={pending === slot.slot}
                onClick={() => save(slot.slot, { mode: "MANUAL" })}
              >
                수동
              </Button>
              <Button
                type="button"
                size="touch"
                variant={slot.enabled ? "secondary" : "outline"}
                disabled={pending === slot.slot}
                onClick={() => save(slot.slot, { enabled: !slot.enabled })}
              >
                {slot.enabled ? "사용 중" : "비활성"}
              </Button>
            </div>
            {slot.mode === "MANUAL" ? (
              <select
                className="mt-2 h-11 w-full rounded-lg border border-input bg-background px-2 text-base"
                value={slot.postId ?? ""}
                onChange={(event) => save(slot.slot, { postId: event.target.value || null })}
              >
                <option value="">홍보글 선택</option>
                {promo.map((post) => (
                  <option key={post.id} value={post.id}>
                    {post.isPaid ? "[유료] " : ""}
                    {post.title}
                  </option>
                ))}
              </select>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">
                최신 홍보글을 자동 배정합니다. {slot.post ? `현재 후보: ${slot.post.title}` : ""}
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
