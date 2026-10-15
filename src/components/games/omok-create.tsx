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
        className="arcade-btn arcade-kr min-h-14 w-full bg-gradient-to-b from-[#ff5a5a] to-[#b3122e] px-4 text-lg text-white"
      >
        {busy ? "방 만드는 중…" : "⚔️ 방 만들고 친구 부르기"}
      </button>
      {error ? (
        <p className="text-sm font-bold text-rose-300">{error}</p>
      ) : null}
    </div>
  );
}
