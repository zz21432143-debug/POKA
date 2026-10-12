"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "cn";
import {
  INTERVAL_CHOICES,
  MAX_DEALERS,
  MAX_TABLES,
  STATUS_LABEL,
  kstClock,
  nowMinutes,
  parseDealerLines,
  planDealers,
  type DealerStatus,
  type RotationAction,
  type RotationStateView,
} from "@/lib/rotation";
import { buildPlan, dealerSchedule, formatClock, parseClock, slotIndexAt, swapInSlot, type RotationPlan } from "@/lib/rotation-plan";

/** 다른 기기 변경 확인 간격 */
const POLL_MS = 2000;

const CHIP: Record<DealerStatus, string> = {
  WAIT: "bg-zinc-600 text-white",
  IN: "bg-emerald-500 text-black",
  OFF: "bg-rose-500 text-white",
  LEFT: "bg-slate-500 text-white",
};

function StatusChip({ status }: { status: DealerStatus }) {
  return <span className={cn("rounded-md px-1.5 py-0.5 text-[11px] font-black", CHIP[status])}>{STATUS_LABEL[status]}</span>;
}

function untilLabel(minutes: number) {
  if (minutes <= 0) return "지금";
  if (minutes < 60) return `${minutes}분 후`;
  return `${Math.floor(minutes / 60)}시간 ${minutes % 60}분 후`;
}

/**
 * 딜러 로테이션(시간표). 시작·끝 시각과 간격(예: 20분)을 정하고 "로테이션 짜기"를 누르면
 * 칸마다 누가 몇 번 테이블에 들어가고 누가 쉬는지 미리 짜 줍니다. 출근 체크·퇴근을 반영해 "지금 이후 다시 짜기"도 됩니다.
 * 2초마다 다른 기기 변경을 확인해 새로고침 없이 반영합니다.
 */
export function RotationBoard({ initial }: { initial: RotationStateView }) {
  const [state, setState] = useState(initial);
  const [clock, setClock] = useState(() => new Date());
  const [error, setError] = useState<string | null>(null);
  const [online, setOnline] = useState(true);
  const [busy, setBusy] = useState(false);
  const [bulk, setBulk] = useState("");
  const [editing, setEditing] = useState<{ id: string; name: string; startTime: string } | null>(null);
  const [cell, setCell] = useState<{ slot: number; table: number } | null>(null);
  const [view, setView] = useState<"table" | "dealer">("table");
  const [showPast, setShowPast] = useState(false);
  const versionRef = useRef(initial.version);

  useEffect(() => {
    let alive = true;
    const poll = async () => {
      if (document.hidden) return;
      try {
        const response = await fetch(`/api/tools/rotation?v=${versionRef.current}`, { cache: "no-store" });
        const data = (await response.json()) as { changed?: boolean; state?: RotationStateView };
        if (!alive) return;
        setOnline(response.ok);
        if (data.changed && data.state) {
          versionRef.current = data.state.version;
          setState(data.state);
        }
      } catch {
        if (alive) setOnline(false);
      }
    };
    const timer = window.setInterval(poll, POLL_MS);
    const tick = window.setInterval(() => setClock(new Date()), 15_000);
    document.addEventListener("visibilitychange", poll);
    return () => {
      alive = false;
      window.clearInterval(timer);
      window.clearInterval(tick);
      document.removeEventListener("visibilitychange", poll);
    };
  }, []);

  const send = useCallback(async (action: RotationAction) => {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/tools/rotation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = (await response.json()) as { state?: RotationStateView; error?: string };
      if (!response.ok || !data.state) throw new Error(data.error ?? "저장하지 못했습니다.");
      versionRef.current = data.state.version;
      setState(data.state);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장하지 못했습니다.");
      return false;
    } finally {
      setBusy(false);
    }
  }, []);

  const start = parseClock(state.planStart) ?? 600;
  const end = parseClock(state.planEnd) ?? 1320;
  const now = nowMinutes(start, clock);
  const plan = state.plan && state.plan.tables === state.tableCount ? state.plan : null;
  const names = useMemo(() => new Map(state.dealers.map((d) => [d.id, d.name])), [state.dealers]);
  const name = (id: string | null) => (id ? (names.get(id) ?? "(삭제됨)") : "—");
  const { current, next } = plan ? slotIndexAt(plan, now) : { current: -1, next: -1 };

  const counts = useMemo(() => {
    const c: Record<DealerStatus, number> = { WAIT: 0, IN: 0, OFF: 0, LEFT: 0 };
    for (const dealer of state.dealers) c[dealer.status] += 1;
    return c;
  }, [state.dealers]);

  function makePlan(fromNow: boolean) {
    const keep = fromNow && plan ? plan.slots.filter((_, index) => index <= current) : [];
    const built = buildPlan({
      dealers: planDealers(state.dealers, start),
      tables: state.tableCount,
      start,
      end,
      interval: state.interval,
      keep,
    });
    void send({ type: "savePlan", plan: built });
  }

  function changeCell(dealerId: string | null) {
    if (!plan || !cell) return;
    const slots = plan.slots.map((slot, index) => (index === cell.slot ? swapInSlot(slot, cell.table, dealerId) : slot));
    void send({ type: "savePlan", plan: { ...plan, slots } satisfies RotationPlan });
    setCell(null);
  }

  // 다음 교대: 바뀌는 자리만
  const changes = useMemo(() => {
    if (!plan || next < 0) return null;
    const before = current >= 0 ? plan.slots[current] : null;
    const after = plan.slots[next];
    const moves = after.seats
      .map((id, table) => ({ table: table + 1, id, prev: before?.seats[table] ?? null }))
      .filter((row) => row.id !== row.prev);
    const toRest = after.rest.filter((id) => !before?.rest.includes(id));
    return { at: after.at, moves, toRest };
  }, [plan, current, next]);

  const visibleSlots = plan ? plan.slots.map((slot, index) => ({ slot, index })).filter(({ index }) => showPast || index >= Math.max(0, current)) : [];

  return (
    <div className="grid gap-4 pb-10 text-white">
      {/* 상단: 연결·인원·설정 */}
      <section className="grid gap-3 rounded-2xl border border-white/15 bg-black p-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className={cn("inline-flex items-center gap-1.5 text-xs font-bold", online ? "text-emerald-400" : "text-rose-400")}>
            <span className={cn("size-2.5 rounded-full", online ? "animate-pulse bg-emerald-400" : "bg-rose-500")} />
            {online ? "실시간 연결됨" : "연결 끊김 · 다시 시도 중"}
          </span>
          <span className="text-sm font-black text-amber-300">지금 {kstClock(clock)}</span>
          {(Object.keys(counts) as DealerStatus[]).map((status) => (
            <span key={status} className="inline-flex items-center gap-1 text-sm font-bold">
              <StatusChip status={status} /> {counts[status]}
            </span>
          ))}
          <span className="text-sm text-zinc-400">· 딜러 {state.dealers.length}/{MAX_DEALERS}</span>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:flex lg:flex-wrap lg:items-end">
          <label className="grid gap-1 text-xs font-bold text-zinc-300">
            시작
            <input
              type="time"
              defaultValue={state.planStart}
              key={`s-${state.planStart}`}
              onBlur={(e) => e.target.value && e.target.value !== state.planStart && void send({ type: "setSettings", planStart: e.target.value })}
              className="h-11 rounded-lg border border-white/20 bg-zinc-900 px-2 text-base font-bold text-white"
            />
          </label>
          <label className="grid gap-1 text-xs font-bold text-zinc-300">
            끝
            <input
              type="time"
              defaultValue={state.planEnd}
              key={`e-${state.planEnd}`}
              onBlur={(e) => e.target.value && e.target.value !== state.planEnd && void send({ type: "setSettings", planEnd: e.target.value })}
              className="h-11 rounded-lg border border-white/20 bg-zinc-900 px-2 text-base font-bold text-white"
            />
          </label>
          <label className="grid gap-1 text-xs font-bold text-zinc-300">
            로테이션 간격
            <select
              value={state.interval}
              disabled={busy}
              onChange={(e) => void send({ type: "setSettings", interval: Number(e.target.value) })}
              className="h-11 rounded-lg border border-white/20 bg-zinc-900 px-2 text-base font-bold"
            >
              {INTERVAL_CHOICES.map((n) => (
                <option key={n} value={n}>
                  {n}분
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-xs font-bold text-zinc-300">
            테이블
            <select
              value={state.tableCount}
              disabled={busy}
              onChange={(e) => void send({ type: "setSettings", tableCount: Number(e.target.value) })}
              className="h-11 rounded-lg border border-white/20 bg-zinc-900 px-2 text-base font-bold"
            >
              {Array.from({ length: MAX_TABLES }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  {n}개
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            disabled={busy || state.dealers.length === 0}
            onClick={() => {
              if (!plan || window.confirm("시간표를 처음부터 새로 짤까요? 손으로 바꾼 칸도 다시 짜집니다.")) makePlan(false);
            }}
            className="col-span-2 min-h-11 rounded-lg bg-amber-400 px-4 text-base font-black text-black disabled:opacity-40 sm:col-span-1"
          >
            로테이션 짜기
          </button>
          {plan ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => makePlan(true)}
              className="col-span-2 min-h-11 rounded-lg border-2 border-amber-400 px-4 text-sm font-black text-amber-300 sm:col-span-1"
            >
              지금 이후 다시 짜기
            </button>
          ) : null}
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              if (window.confirm("새 근무일을 시작할까요? 출근 체크가 모두 지워지고 시간표도 비워집니다. 딜러 명단은 그대로 남습니다.")) {
                void send({ type: "newDay" });
              }
            }}
            className="min-h-11 rounded-lg border border-white/25 px-3 text-sm font-bold hover:bg-white/10"
          >
            새 근무일
          </button>
        </div>
        <p className="text-xs text-zinc-400">
          출근 체크·퇴근이 생기면 <b className="text-amber-300">지금 이후 다시 짜기</b>를 누르세요. 이미 지난 칸은 그대로 두고 남은 칸만 다시 짭니다.
        </p>
      </section>

      {error ? <p className="rounded-lg bg-rose-950 px-3 py-2 text-sm font-bold text-rose-200">{error}</p> : null}

      {/* 다음 교대 */}
      {plan && changes ? (
        <section aria-label="다음 교대" className="grid gap-2 rounded-2xl border-2 border-amber-400 bg-amber-950/30 p-3">
          <p className="flex flex-wrap items-baseline gap-2">
            <span className="text-2xl font-black text-amber-300">다음 교대 {formatClock(changes.at)}</span>
            <span className="text-sm font-bold text-amber-100">{untilLabel(changes.at - now)}</span>
          </p>
          {changes.moves.length === 0 && changes.toRest.length === 0 ? (
            <p className="text-sm text-zinc-300">바뀌는 자리가 없습니다.</p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
              <ul className="flex flex-wrap gap-1.5">
                {changes.moves.map((move) => (
                  <li key={move.table} className="rounded-lg bg-black px-2.5 py-1.5 text-sm font-bold">
                    <span className="text-emerald-300">T{move.table}</span> ← {name(move.id)}
                  </li>
                ))}
              </ul>
              {changes.toRest.length ? (
                <p className="text-sm font-bold">
                  <span className="mr-1 rounded-md bg-amber-400 px-1.5 py-0.5 text-xs text-black">휴식</span>
                  {changes.toRest.map(name).join(", ")}
                </p>
              ) : null}
            </div>
          )}
        </section>
      ) : null}

      {/* 시간표 */}
      <section aria-label="시간표" className="grid gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-black">로테이션 시간표</h2>
          {plan ? (
            <>
              <div className="flex rounded-full border border-white/20 p-0.5">
                {(["table", "dealer"] as const).map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setView(key)}
                    className={cn("min-h-9 rounded-full px-3 text-xs font-bold", view === key ? "bg-white text-black" : "text-zinc-300")}
                  >
                    {key === "table" ? "테이블별" : "딜러별"}
                  </button>
                ))}
              </div>
              <label className="ml-auto inline-flex items-center gap-1.5 text-xs font-bold text-zinc-300">
                <input type="checkbox" checked={showPast} onChange={(e) => setShowPast(e.target.checked)} className="size-4" />
                지난 칸도 보기
              </label>
            </>
          ) : null}
        </div>

        {!plan ? (
          <p className="rounded-xl border border-dashed border-white/25 p-4 text-sm text-zinc-300">
            {state.plan ? "테이블 수가 바뀌어 시간표를 다시 짜야 합니다. " : ""}
            딜러를 등록하고 시작·끝 시각, 간격, 테이블 수를 정한 뒤 <b className="text-amber-300">로테이션 짜기</b>를 누르세요.
          </p>
        ) : view === "table" ? (
          <div className="overflow-x-auto rounded-xl border border-white/15">
            <table className="min-w-full border-collapse text-sm">
              <thead className="sticky top-0 bg-zinc-900">
                <tr>
                  <th className="sticky left-0 z-10 bg-zinc-900 px-2 py-2 text-left text-xs font-black text-zinc-300">시각</th>
                  {Array.from({ length: plan.tables }, (_, t) => (
                    <th key={t} className="px-2 py-2 text-xs font-black text-emerald-300">
                      T{t + 1}
                    </th>
                  ))}
                  <th className="px-2 py-2 text-left text-xs font-black text-amber-300">휴식</th>
                </tr>
              </thead>
              <tbody>
                {visibleSlots.map(({ slot, index }) => (
                  <tr
                    key={slot.at}
                    data-slot={formatClock(slot.at)}
                    className={cn(
                      "border-t border-white/10",
                      index === current && "bg-emerald-950/70",
                      index === next && "bg-amber-950/40",
                      index < current && "opacity-50",
                    )}
                  >
                    <th className="sticky left-0 z-10 bg-inherit px-2 py-1.5 text-left font-black whitespace-nowrap">
                      <span className={cn(index === current ? "text-emerald-300" : index === next ? "text-amber-300" : "text-white")}>
                        {formatClock(slot.at)}
                      </span>
                      {index === current ? <span className="ml-1 text-[10px] text-emerald-300">지금</span> : null}
                      {index === next ? <span className="ml-1 text-[10px] text-amber-300">다음</span> : null}
                    </th>
                    {slot.seats.map((id, t) => (
                      <td key={t} className="px-1 py-1">
                        <button
                          type="button"
                          onClick={() => setCell({ slot: index, table: t })}
                          className={cn(
                            "w-full min-w-[4.5rem] truncate rounded-md px-1.5 py-1.5 text-center text-sm font-bold",
                            id ? "bg-zinc-800 hover:bg-zinc-700" : "border border-dashed border-rose-500/60 text-rose-300",
                            cell?.slot === index && cell.table === t && "ring-2 ring-amber-300",
                          )}
                        >
                          {id ? name(id) : "비어 있음"}
                        </button>
                      </td>
                    ))}
                    <td className="px-2 py-1.5 text-xs font-bold whitespace-nowrap text-amber-200">{slot.rest.map(name).join(", ") || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid gap-2">
            {state.dealers
              .filter((d) => d.status !== "OFF")
              .map((dealer) => {
                const schedule = dealerSchedule(plan, dealer.id).filter((_, index) => showPast || index >= Math.max(0, current));
                return (
                  <div key={dealer.id} data-schedule={dealer.name} className="grid gap-1.5 rounded-xl border border-white/15 bg-zinc-950 p-2 sm:grid-cols-[8rem_1fr] sm:items-center">
                    <p className="flex items-center gap-1.5 text-base font-black">
                      {dealer.name} <StatusChip status={dealer.status} />
                    </p>
                    <ul className="flex flex-wrap gap-1">
                      {schedule.map((row) => (
                        <li
                          key={row.at}
                          className={cn(
                            "rounded-md px-1.5 py-1 text-xs font-bold",
                            row.table == null
                              ? "bg-zinc-900 text-zinc-600"
                              : row.table === 0
                                ? "bg-amber-400 text-black"
                                : "bg-emerald-600 text-white",
                          )}
                        >
                          {formatClock(row.at)} {row.table == null ? "—" : row.table === 0 ? "휴식" : `T${row.table}`}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
          </div>
        )}
      </section>

      {/* 딜러 · 출근 체크 */}
      <section aria-label="딜러" className="grid gap-2">
        <h2 className="text-lg font-black">딜러 · 출근 체크</h2>
        {state.dealers.length === 0 ? (
          <p className="rounded-xl border border-dashed border-white/25 p-4 text-sm text-zinc-400">아래에서 딜러를 등록하세요.</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {state.dealers.map((dealer) => (
              <div key={dealer.id} data-dealer={dealer.name} className="grid gap-2 rounded-xl border border-white/15 bg-zinc-950 p-2">
                <div className="flex items-center justify-between gap-2">
                  <button type="button" onClick={() => setEditing({ id: dealer.id, name: dealer.name, startTime: dealer.startTime ?? "" })} className="truncate text-left text-base font-black underline-offset-2 hover:underline">
                    {dealer.name}
                  </button>
                  <StatusChip status={dealer.status} />
                </div>
                <p className="text-xs text-zinc-300">
                  예정 {dealer.startTime ?? "—"}
                  {dealer.checkedInAt ? <b className="ml-2 text-emerald-300">출근 {kstClock(dealer.checkedInAt)}</b> : null}
                  {dealer.leftAt ? <b className="ml-2 text-slate-300">퇴근 {kstClock(dealer.leftAt)}</b> : null}
                </p>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void send({ type: "checkIn", id: dealer.id })}
                    className={cn("min-h-10 rounded-lg text-sm font-black", dealer.status === "IN" ? "bg-emerald-900 text-emerald-300" : "bg-emerald-500 text-black")}
                  >
                    {dealer.status === "IN" ? "출근 ✓" : "출근 체크"}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void send({ type: "setStatus", id: dealer.id, status: dealer.status === "OFF" ? "WAIT" : "OFF" })}
                    className="min-h-10 rounded-lg bg-rose-600 text-sm font-black text-white"
                  >
                    {dealer.status === "OFF" ? "휴무 취소" : "휴무"}
                  </button>
                  <button
                    type="button"
                    disabled={busy || dealer.status === "LEFT"}
                    onClick={() => void send({ type: "setStatus", id: dealer.id, status: "LEFT" })}
                    className="min-h-10 rounded-lg bg-slate-500 text-sm font-black text-white disabled:opacity-40"
                  >
                    퇴근
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 딜러 등록 */}
      <section aria-label="딜러 등록" className="grid gap-2 rounded-2xl border border-white/15 bg-zinc-950 p-3">
        <h2 className="text-lg font-black">딜러 등록</h2>
        <p className="text-xs text-zinc-400">한 줄에 한 명 · 예정 출근 시간은 선택 (예: 김딜러 18:00). 최대 {MAX_DEALERS}명.</p>
        <textarea
          value={bulk}
          onChange={(event) => setBulk(event.target.value)}
          rows={4}
          className="rounded-lg border border-white/20 bg-black p-2 text-base"
          placeholder={"김딜러 10:00\n이딜러 10:00\n박딜러 10:30"}
        />
        <button
          type="button"
          disabled={busy || !bulk.trim()}
          onClick={async () => {
            const dealers = parseDealerLines(bulk);
            if (dealers.length && (await send({ type: "addDealers", dealers }))) setBulk("");
          }}
          className="min-h-11 justify-self-start rounded-lg bg-emerald-500 px-4 text-sm font-black text-black disabled:opacity-40"
        >
          {parseDealerLines(bulk).length || ""}명 등록
        </button>
      </section>

      {/* 칸 바꾸기 */}
      {plan && cell ? (
        <div className="fixed inset-0 z-[60] grid place-items-end bg-black/70 p-3 sm:place-items-center" role="dialog" aria-label="칸 바꾸기">
          <div className="grid max-h-[80dvh] w-full max-w-md gap-3 overflow-y-auto rounded-2xl border border-white/20 bg-zinc-950 p-4">
            <h3 className="text-lg font-black">
              {formatClock(plan.slots[cell.slot].at)} · T{cell.table + 1} <span className="text-sm text-zinc-400">지금: {name(plan.slots[cell.slot].seats[cell.table])}</span>
            </h3>
            <p className="text-xs text-zinc-400">고른 딜러가 다른 테이블에 있으면 자리를 맞바꾸고, 쉬던 딜러면 지금 딜러가 휴식으로 갑니다. 이 칸만 바뀝니다.</p>
            <div className="grid grid-cols-2 gap-1.5">
              {plan.slots[cell.slot].rest.map((id) => (
                <button key={id} type="button" onClick={() => changeCell(id)} className="min-h-11 rounded-lg bg-amber-400 px-2 text-sm font-black text-black">
                  {name(id)} <span className="text-[10px]">(휴식)</span>
                </button>
              ))}
              {plan.slots[cell.slot].seats.map((id, t) =>
                id && t !== cell.table ? (
                  <button key={id} type="button" onClick={() => changeCell(id)} className="min-h-11 rounded-lg bg-zinc-800 px-2 text-sm font-bold">
                    {name(id)} <span className="text-[10px] text-zinc-400">(T{t + 1}와 바꾸기)</span>
                  </button>
                ) : null,
              )}
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => changeCell(null)} className="min-h-11 rounded-lg border border-rose-500/60 px-3 text-sm font-bold text-rose-300">
                이 칸 비우기
              </button>
              <button type="button" onClick={() => setCell(null)} className="ml-auto min-h-11 rounded-lg border border-white/30 px-4 text-sm font-bold">
                닫기
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* 딜러 수정 */}
      {editing ? (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-black/70 p-4" role="dialog" aria-label="딜러 수정">
          <div className="grid w-full max-w-sm gap-3 rounded-2xl border border-white/20 bg-zinc-950 p-4">
            <h3 className="text-lg font-black">딜러 수정</h3>
            <label className="grid gap-1 text-sm font-bold">
              이름
              <input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} className="h-11 rounded-lg border border-white/20 bg-black px-2 text-base" />
            </label>
            <label className="grid gap-1 text-sm font-bold">
              예정 출근 시간
              <input value={editing.startTime} placeholder="10:00" onChange={(e) => setEditing({ ...editing, startTime: e.target.value })} className="h-11 rounded-lg border border-white/20 bg-black px-2 text-base" />
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={async () => {
                  if (await send({ type: "updateDealer", id: editing.id, name: editing.name, startTime: editing.startTime })) setEditing(null);
                }}
                className="min-h-11 rounded-lg bg-emerald-500 px-4 text-sm font-black text-black"
              >
                저장
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={async () => {
                  if (window.confirm(`${editing.name} 딜러를 삭제할까요? 시간표에서는 '(삭제됨)'으로 남으니 다시 짜 주세요.`)) {
                    if (await send({ type: "removeDealer", id: editing.id })) setEditing(null);
                  }
                }}
                className="min-h-11 rounded-lg bg-rose-600 px-4 text-sm font-black text-white"
              >
                삭제
              </button>
              <button type="button" onClick={() => setEditing(null)} className="ml-auto min-h-11 rounded-lg border border-white/30 px-4 text-sm font-bold">
                닫기
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

