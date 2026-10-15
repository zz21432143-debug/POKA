"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "cn";
import type { MissionStatus } from "@/lib/missions";

const REWARD = "+100P · EXP +30";

/** 오늘의 미션 4개 · 다 하면 보너스 받기 */
export function MissionCard({ initial }: { initial: MissionStatus }) {
  const [m, setM] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  async function claim() {
    setBusy(true);
    setNote(null);
    try {
      const res = await fetch("/api/missions", { method: "POST" });
      const json = (await res.json()) as { missions?: MissionStatus; error?: string };
      if (json.missions) setM(json.missions);
      if (!res.ok) throw new Error(json.error ?? "잠시 뒤에 다시 해 주세요.");
      setNote(`보너스 ${REWARD}를 받았어요! 내일 또 만나요 🎉`);
    } catch (e) {
      setNote(e instanceof Error ? e.message : "잠시 뒤에 다시 해 주세요.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-label="오늘의 미션" data-missions={`${m.done}/${m.items.length}`} className="lounge-card grid gap-2 rounded-[1.35rem] p-3 sm:p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-base font-black text-white">오늘의 미션</h2>
        <span className="text-xs font-bold text-[#e7c98a] tabular-nums">
          {m.done} / {m.items.length}
        </span>
        <span className="text-xs text-zinc-400">다 하면 {REWARD}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-[#c9a25c] transition-[width] duration-500" style={{ width: `${(m.done / m.items.length) * 100}%` }} />
      </div>
      <ul className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
        {m.items.map((item) => (
          <li key={item.key}>
            <Link
              href={item.href}
              data-mission={item.key}
              data-done={item.done ? "1" : "0"}
              className={cn(
                "flex min-h-11 items-center gap-1.5 rounded-xl border px-2.5 text-sm font-bold",
                item.done ? "border-emerald-500/40 bg-emerald-950/30 text-emerald-200" : "border-[#c9a25c]/30 bg-black/30 text-white hover:border-[#c9a25c]",
              )}
            >
              <span>{item.done ? "✅" : "⬜"}</span>
              <span className="min-w-0 truncate">{item.label}</span>
            </Link>
          </li>
        ))}
      </ul>
      {m.claimed ? (
        <p data-missions-claimed className="text-xs font-bold text-emerald-300">
          오늘 보너스를 받았어요. 내일 또 만나요!
        </p>
      ) : m.allDone ? (
        <button type="button" data-missions-claim disabled={busy} onClick={() => void claim()} className="min-h-11 rounded-xl bg-[#7a1c22] text-sm font-black text-white hover:bg-[#93242c] disabled:opacity-60">
          🎁 보너스 받기 ({REWARD})
        </button>
      ) : null}
      {note ? <p className="text-xs font-bold text-[#e7c98a]">{note}</p> : null}
    </section>
  );
}
