"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/** 친구 대전 방 만들기 → 방으로 이동(초대 링크 보내기) */
export function OmokCreate() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="grid gap-1">
      <button
        type="button"
        data-omok-create
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError(null);
          try {
            const res = await fetch("/api/games/omok", { method: "POST" });
            const json = (await res.json()) as { id?: string; error?: string };
            if (!res.ok || !json.id)
              throw new Error(json.error ?? "방을 만들지 못했어요.");
            router.push(`/games/omok/${json.id}`);
          } catch (e) {
            setError(e instanceof Error ? e.message : "방을 만들지 못했어요.");
            setBusy(false);
          }
        }}
        className="min-h-14 w-full rounded-2xl bg-gradient-to-b from-[#9b2a2f] to-[#6b1519] px-4 text-base font-black text-[#f6efe2] shadow-[0_0_0_1px_rgba(245,196,81,.5)] disabled:opacity-60"
      >
        {busy ? "방 만드는 중…" : "⚔️ 친구 대전 방 만들기"}
      </button>
      {error ? (
        <p className="text-sm font-bold text-rose-300">{error}</p>
      ) : null}
    </div>
  );
}
