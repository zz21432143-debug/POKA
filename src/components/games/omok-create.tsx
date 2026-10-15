"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/** 방 만들기 → 그 방(오목판 앞 대기실)으로. 요괴가 없으면 요괴 고르기로 */
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
            const json = (await res.json()) as {
              id?: string;
              error?: string;
              code?: string;
            };
            if (json.code === "NO_YOKAI") {
              router.push("/yokai?next=%2Fgames%2Fomok");
              return;
            }
            if (!res.ok || !json.id)
              throw new Error(json.error ?? "방을 만들지 못했어요.");
            router.push(`/games/omok/${json.id}`);
          } catch (e) {
            setError(e instanceof Error ? e.message : "방을 만들지 못했어요.");
            setBusy(false);
          }
        }}
        className="arcade-btn btn-main min-h-14 w-full text-xl"
      >
        {busy ? "방 만드는 중…" : "🏮 방 만들기"}
      </button>
      {error ? (
        <p className="text-sm font-bold text-[#ff5d6c]">{error}</p>
      ) : null}
    </div>
  );
}

/** 방 코드(5글자)로 입장 */
export function OmokCodeEntry() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      data-omok-code-form
      className="grid gap-2"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        try {
          const res = await fetch(
            `/api/games/omok?code=${encodeURIComponent(code)}`,
            { cache: "no-store" },
          );
          const json = (await res.json()) as { id?: string; error?: string };
          if (!res.ok || !json.id)
            throw new Error(json.error ?? "그런 방 코드가 없어요.");
          router.push(`/games/omok/${json.id}`);
        } catch (err) {
          setError(
            err instanceof Error ? err.message : "그런 방 코드가 없어요.",
          );
          setBusy(false);
        }
      }}
    >
      <label className="text-base font-black text-white" htmlFor="omok-code">
        🔑 방 코드로 입장
      </label>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
        <input
          id="omok-code"
          data-omok-code-input
          value={code}
          onChange={(e) =>
            setCode(
              e.target.value
                .toUpperCase()
                .replace(/[^A-Z0-9]/g, "")
                .slice(0, 5),
            )
          }
          inputMode="text"
          autoCapitalize="characters"
          autoComplete="off"
          placeholder="K7Q2P"
          className="arcade-px min-h-14 w-full min-w-0 rounded-xl border-2 border-[#ffcf4a] bg-[#0d0818] px-3 text-center text-xl tracking-[0.25em] text-[#ffcf4a] placeholder:text-[#ffcf4a]/30"
        />
        <button
          type="submit"
          disabled={busy || code.length !== 5}
          className="arcade-btn btn-gold min-h-14 px-5 text-lg"
        >
          입장
        </button>
      </div>
      {error ? (
        <p className="text-sm font-bold text-[#ff5d6c]">{error}</p>
      ) : null}
    </form>
  );
}
