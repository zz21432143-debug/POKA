"use client";

import { useState } from "react";
import { formatWorkDate, kstClock, kstDate, type RotationStateView } from "@/lib/rotation";
import type { PayShift } from "@/lib/pay-calc";

/**
 * 급여 계산기: 내 딜러 로테이션의 출근·퇴근 기록을 근무 한 줄로 불러옵니다.
 * 출근 체크 시각(없으면 예정 출근) ~ 퇴근 시각(없으면 예정 퇴근, 아직 근무 중이면 지금).
 */
export function PayImport({ onAdd }: { onAdd: (shift: PayShift, label: string) => void }) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<RotationStateView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load(game?: string) {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/tools/rotation${game ? `?g=${encodeURIComponent(game)}` : ""}`, { cache: "no-store" });
      const data = (await response.json()) as { state?: RotationStateView; error?: string };
      if (!response.ok || !data.state) throw new Error(data.error ?? "로테이션을 불러오지 못했습니다.");
      setState(data.state);
    } catch (err) {
      setError(err instanceof Error ? err.message : "로테이션을 불러오지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }

  function add(dealerId: string) {
    const dealer = state?.dealers.find((d) => d.id === dealerId);
    if (!state || !dealer) return;
    const start = dealer.checkedInAt ? kstClock(dealer.checkedInAt) : dealer.startTime;
    const end = dealer.leftAt ? kstClock(dealer.leftAt) : (dealer.endTime ?? (dealer.status === "IN" ? kstClock(new Date()) : null));
    if (!start || !end) {
      setError(`${dealer.name}: 출근·퇴근 시간이 없어 불러올 수 없습니다(로테이션에서 시간을 넣어 주세요).`);
      return;
    }
    onAdd({ date: state.game.workDate ?? kstDate(), start, end, breakMinutes: 0 }, `${dealer.name} · ${state.game.name}`);
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          void load();
        }}
        className="min-h-10 justify-self-start rounded-lg border border-sky-400/60 px-3 text-sm font-black text-sky-200 hover:bg-sky-950"
      >
        내 로테이션에서 출퇴근 불러오기
      </button>
    );
  }
  return (
    <div data-pay-import className="grid gap-2 rounded-xl border border-sky-500/50 bg-sky-950/30 p-2">
      <div className="flex flex-wrap items-center gap-2 text-sm font-bold">
        <span className="text-sky-200">내 로테이션에서 불러오기</span>
        {state ? (
          <select
            aria-label="불러올 게임"
            value={state.game.id}
            disabled={busy}
            onChange={(e) => void load(e.target.value)}
            className="h-10 min-w-0 max-w-full rounded-lg border border-white/20 bg-black px-2 text-sm"
          >
            {state.games.map((g) => (
              <option key={g.id} value={g.id}>
                {formatWorkDate(g.workDate)} · {g.name}
              </option>
            ))}
          </select>
        ) : null}
        <button type="button" onClick={() => setOpen(false)} className="ml-auto min-h-9 rounded px-2 text-xs text-zinc-400 hover:bg-white/10">
          닫기
        </button>
      </div>
      {busy && !state ? <p className="text-xs text-zinc-400">불러오는 중…</p> : null}
      {state && state.dealers.length === 0 ? <p className="text-xs text-zinc-400">이 게임에는 딜러가 없습니다.</p> : null}
      {state && state.dealers.length ? (
        <div className="flex flex-wrap gap-1.5">
          {state.dealers.map((d) => {
            const start = d.checkedInAt ? kstClock(d.checkedInAt) : d.startTime;
            const end = d.leftAt ? kstClock(d.leftAt) : d.endTime;
            return (
              <button
                key={d.id}
                type="button"
                onClick={() => add(d.id)}
                className="min-h-10 rounded-lg bg-black px-2.5 text-sm font-bold hover:bg-zinc-800"
              >
                {d.name} <span className="text-xs text-zinc-400">{start ?? "?"}~{end ?? (d.status === "IN" ? "근무 중" : "?")}</span>
              </button>
            );
          })}
        </div>
      ) : null}
      {error ? <p className="text-xs font-bold text-rose-300">{error}</p> : null}
      <p className="text-[11px] text-zinc-500">딜러 이름을 누르면 그날 출근~퇴근이 근무 기록에 한 줄 추가됩니다.</p>
    </div>
  );
}
