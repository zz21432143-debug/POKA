"use client";

import { useState } from "react";
import { cn } from "cn";
import { addDays, dayLabel } from "@/lib/job-events";
import type { DealerAvailability } from "@/lib/job-board";

/** 가능한 날(앞으로 14일) · 지역 고르기 · 「날짜 상관없이 이 지역 새 빈자리 알림」 */
export function AvailabilityForm({ initial, today, regions }: { initial: DealerAvailability | null; today: string; regions: string[] }) {
  const [region, setRegion] = useState(initial?.region ?? "");
  const [dates, setDates] = useState<string[]>(initial?.dates ?? []);
  const [anyDate, setAnyDate] = useState(initial?.anyDate ?? false);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const days = Array.from({ length: 14 }, (_, i) => addDays(today, i));
  const toggle = (d: string) => setDates((v) => (v.includes(d) ? v.filter((x) => x !== d) : [...v, d].sort()));
  async function save() {
    setBusy(true);
    setNote(null);
    const r = await fetch("/api/jobs/available", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ region, dates, anyDate }) }).catch(() => null);
    const j = (await r?.json().catch(() => null)) as { error?: string } | null;
    setBusy(false);
    setNote(r?.ok ? "✅ 저장했어요. 빈자리가 생기면 알림을 보내 드려요(앱 알림을 켜 둔 기기)." : (j?.error ?? "저장하지 못했어요."));
  }
  async function clear() {
    setBusy(true);
    await fetch("/api/jobs/available", { method: "DELETE" }).catch(() => null);
    setBusy(false);
    setDates([]);
    setAnyDate(false);
    setNote("지웠어요. 더 이상 알림이 가지 않아요.");
  }
  return (
    <div data-availability-form className="grid gap-3 rounded-2xl border border-[#c9a25c]/35 bg-[#17120f] p-3">
      <label className="grid gap-1 text-sm font-bold text-white">
        지역
        <select value={region} onChange={(e) => setRegion(e.target.value)} className="min-h-11 rounded-xl border border-white/20 bg-black/40 px-3 text-base text-white">
          <option value="">지역을 골라 주세요</option>
          {regions.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </label>
      <div className="grid gap-1.5">
        <p className="text-sm font-bold text-white">가능한 날(여러 개 고를 수 있어요)</p>
        <ul className="grid grid-cols-4 gap-1.5 sm:grid-cols-7">
          {days.map((d) => (
            <li key={d}>
              <button
                type="button"
                data-avail-day={d}
                aria-pressed={dates.includes(d)}
                onClick={() => toggle(d)}
                className={cn("min-h-11 w-full rounded-xl border text-sm font-black", dates.includes(d) ? "border-[#ffcf4a] bg-[#ffcf4a] text-[#2a1400]" : "border-white/15 bg-black/30 text-white")}
              >
                {dayLabel(d)}
              </button>
            </li>
          ))}
        </ul>
      </div>
      <label className="flex min-h-11 items-center gap-2 text-sm font-bold text-white">
        <span className="touch-check">
          <input type="checkbox" checked={anyDate} onChange={(e) => setAnyDate(e.target.checked)} />
        </span>
        날짜 상관없이 이 지역 새 빈자리가 올라오면 알림
      </label>
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <button type="button" disabled={busy} onClick={() => void save()} className="arcade-btn btn-main min-h-12 text-base">
          저장
        </button>
        {initial ? (
          <button type="button" disabled={busy} onClick={() => void clear()} className="arcade-btn btn-dark min-h-12 px-4 text-sm">
            지우기
          </button>
        ) : null}
      </div>
      {note ? <p className="text-sm font-bold text-[#ffe08a]">{note}</p> : null}
    </div>
  );
}
