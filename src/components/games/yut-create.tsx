"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { cn } from "cn";
import { RoomTitleInput } from "@/components/games/omok-create";

const MODES = [
  { m: 1, label: "1:1", hint: "말 4개" },
  { m: 2, label: "2:2", hint: "말 4개" },
  { m: 3, label: "3:3", hint: "말 3개" },
  { m: 4, label: "4:4", hint: "말 3개" },
];

/** 윷놀이 방 만들기(인원 고르기 · 비공개) → 그 방 대기실로 */
export function YutCreate() {
  const router = useRouter();
  const [mode, setMode] = useState(2);
  const [priv, setPriv] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  return (
    <div className="grid gap-1.5">
      <RoomTitleInput value={title} onChange={setTitle} />
      <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-label="인원">
        {MODES.map((x) => (
          <button
            key={x.m}
            type="button"
            role="radio"
            aria-checked={mode === x.m}
            data-yut-create-mode={x.m}
            onClick={() => setMode(x.m)}
            className={cn("grid min-h-12 place-items-center rounded-xl border-2 py-0.5 font-black", mode === x.m ? "border-[#ffcf4a] bg-[#ffcf4a] text-[#2a1400]" : "border-white/20 bg-black/40 text-white")}
          >
            <span className="text-xl">{x.label}</span>
            <span className="text-[11px] opacity-80">{x.hint}</span>
          </button>
        ))}
      </div>
      <button
        type="button"
        data-yut-create
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError(null);
          try {
            const res = await fetch("/api/games/yut", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode, private: priv, title }) });
            const json = (await res.json()) as { id?: string; error?: string; code?: string };
            if (json.code === "NO_YOKAI") {
              router.push("/yokai?next=%2Fgames%2Fyut");
              return;
            }
            if (!res.ok || !json.id) throw new Error(json.error ?? "방을 만들지 못했어요.");
            router.push(`/games/yut/${json.id}`);
          } catch (e) {
            setError(e instanceof Error ? e.message : "방을 만들지 못했어요.");
            setBusy(false);
          }
        }}
        className="arcade-btn btn-main min-h-12 w-full text-lg"
      >
        {busy ? "방 만드는 중…" : `${priv ? "🔒 " : "🎲 "}${mode}:${mode} 방 만들기`}
      </button>
      {/* 비공개 방: 한 줄(체크 · 이름 · 짧은 설명) */}
      <label className="flex min-h-10 cursor-pointer items-center gap-2 overflow-hidden rounded-lg bg-black/30 px-2.5 text-sm font-bold whitespace-nowrap text-white">
        <input type="checkbox" data-yut-private checked={priv} onChange={(e) => setPriv(e.target.checked)} className="size-4 shrink-0 accent-[#b77bff]" />
        <span className="shrink-0">🔒 비공개 방</span>
        <span className="min-w-0 truncate text-xs font-normal text-[#d6cdee]">로비에 안 보이고 코드 · 링크로만</span>
      </label>
      {error ? <p className="text-sm font-bold text-[#ff5d6c]">{error}</p> : null}
    </div>
  );
}

/** 초대 코드(6글자)로 입장 */
export function YutCodeEntry() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      data-yut-code-form
      className="grid gap-1.5"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        try {
          const res = await fetch(`/api/games/yut?code=${encodeURIComponent(code)}`, { cache: "no-store" });
          const json = (await res.json()) as { id?: string; error?: string };
          if (!res.ok || !json.id) throw new Error(json.error ?? "그런 초대 코드가 없어요.");
          router.push(`/games/yut/${json.id}`);
        } catch (err) {
          setError(err instanceof Error ? err.message : "그런 초대 코드가 없어요.");
          setBusy(false);
        }
      }}
    >
      <label className="text-base font-black text-white" htmlFor="yut-code">
        🔑 초대 코드로 입장
      </label>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
        <input
          id="yut-code"
          data-yut-code-input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))}
          autoCapitalize="characters"
          autoComplete="off"
          placeholder="K7Q2PX"
          className="arcade-px min-h-12 w-full min-w-0 rounded-xl border-2 border-[#ffcf4a] bg-[#0d0818] px-3 text-center text-xl tracking-[0.25em] text-[#ffcf4a] placeholder:text-[#ffcf4a]/30"
        />
        <button type="submit" disabled={busy || code.length !== 6} className="arcade-btn btn-gold min-h-12 px-5 text-lg">
          입장
        </button>
      </div>
      {error ? <p className="text-sm font-bold text-[#ff5d6c]">{error}</p> : null}
    </form>
  );
}
