"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "cn";

/** 관리자: 이 글을 게시판 위 「📌 중요」로 고정 · 해제 */
export function PinToggle({ postId, pinned }: { postId: string; pinned: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [on, setOn] = useState(pinned);
  const [error, setError] = useState<string | null>(null);
  async function toggle() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/posts/${postId}/pin`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pinned: !on }) });
    const json = (await res.json().catch(() => ({}))) as { error?: string };
    setBusy(false);
    if (!res.ok) return setError(json.error ?? "바꾸지 못했어요.");
    setOn(!on);
    router.refresh();
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        data-pin-toggle={on ? "on" : "off"}
        disabled={busy}
        onClick={() => void toggle()}
        className={cn(
          "inline-flex min-h-10 items-center rounded-full border px-4 text-sm font-bold disabled:opacity-60",
          on ? "border-[#e5484d] bg-[#e5484d]/15 text-[#ffb3b5]" : "border-white/20 text-zinc-200 hover:border-[#e5484d]/60",
        )}
      >
        📌 {on ? "중요 표시 풀기" : "게시판 위에 중요로 고정"}
      </button>
      {error ? <span className="text-xs font-bold text-rose-300">{error}</span> : null}
    </div>
  );
}
