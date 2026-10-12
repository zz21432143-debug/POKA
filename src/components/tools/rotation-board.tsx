"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "cn";
import {
  MAX_DEALERS,
  MAX_TABLES,
  STATUS_LABEL,
  dealerSegments,
  dealerTotals,
  formatDuration,
  formatSince,
  parseDealerLines,
  type DealerStatus,
  type RotationAction,
  type RotationDealerView,
  type RotationStateView,
} from "@/lib/rotation";

/** 다른 기기 변경 확인 간격 */
const POLL_MS = 2000;

const CHIP: Record<DealerStatus, string> = {
  WORKING: "bg-emerald-500 text-black",
  BREAK: "bg-amber-400 text-black",
  OFF: "bg-rose-500 text-white",
  LEFT: "bg-slate-500 text-white",
};

const BAR: Record<DealerStatus, string> = {
  WORKING: "bg-emerald-500",
  BREAK: "bg-amber-400",
  OFF: "bg-rose-500/70",
  LEFT: "bg-slate-500/70",
};

function StatusChip({ status }: { status: DealerStatus }) {
  return <span className={cn("rounded-md px-1.5 py-0.5 text-[11px] font-black", CHIP[status])}>{STATUS_LABEL[status]}</span>;
}

/**
 * 딜러 로테이션 보드. 딜러를 누르고 테이블을 누르면 배정(그 자리 딜러는 휴식으로 교대),
 * 테이블을 먼저 눌러도 됩니다. 2초마다 다른 기기 변경을 확인해 새로고침 없이 반영합니다.
 */
export function RotationBoard({ initial }: { initial: RotationStateView }) {
  const [state, setState] = useState(initial);
  const [now, setNow] = useState(() => Date.now());
  const [selectedDealer, setSelectedDealer] = useState<string | null>(null);
  const [selectedTable, setSelectedTable] = useState<number | null>(null);
  const [filter, setFilter] = useState<DealerStatus | "ALL">("ALL");
  const [error, setError] = useState<string | null>(null);
  const [online, setOnline] = useState(true);
  const [busy, setBusy] = useState(false);
  const [bulk, setBulk] = useState("");
  const [editing, setEditing] = useState<{ id: string; name: string; startTime: string } | null>(null);
  const versionRef = useRef(initial.version);

  // 다른 기기 변경 확인
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
    const tick = window.setInterval(() => setNow(Date.now()), 20_000);
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
      setNow(Date.now());
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장하지 못했습니다.");
      return false;
    } finally {
      setBusy(false);
    }
  }, []);

  const dayStart = new Date(state.dayStartedAt).getTime();
  const byTable = useMemo(() => {
    const map = new Map<number, RotationDealerView>();
    for (const dealer of state.dealers) if (dealer.status === "WORKING" && dealer.tableNo) map.set(dealer.tableNo, dealer);
    return map;
  }, [state.dealers]);
  const counts = useMemo(() => {
    const c: Record<DealerStatus, number> = { WORKING: 0, BREAK: 0, OFF: 0, LEFT: 0 };
    for (const dealer of state.dealers) c[dealer.status] += 1;
    return c;
  }, [state.dealers]);
  const totals = useMemo(
    () => new Map(state.dealers.map((d) => [d.id, dealerTotals(dealerSegments(state.events, d.id, now, dayStart))])),
    [state.dealers, state.events, now, dayStart],
  );
  const selected = state.dealers.find((d) => d.id === selectedDealer) ?? null;

  async function onTable(tableNo: number) {
    if (selectedDealer) {
      if (await send({ type: "assign", id: selectedDealer, tableNo })) setSelectedDealer(null);
      return;
    }
    setSelectedTable(selectedTable === tableNo ? null : tableNo);
  }

  async function onDealer(dealer: RotationDealerView) {
    if (selectedTable) {
      if (await send({ type: "assign", id: dealer.id, tableNo: selectedTable })) setSelectedTable(null);
      return;
    }
    setSelectedDealer(selectedDealer === dealer.id ? null : dealer.id);
  }

  const visibleDealers = state.dealers.filter((d) => filter === "ALL" || d.status === filter);
  const tables = Array.from({ length: state.tableCount }, (_, i) => i + 1);

  // 타임라인 범위: 근무일 시작(또는 첫 기록) ~ 지금
  const firstEvent = state.events.length ? Math.max(dayStart, new Date(state.events[0].at).getTime()) : now;
  const span = Math.max(now - firstEvent, 60_000);

  return (
    <div className="grid gap-4 pb-28 text-white">
      {/* 상단 요약 */}
      <section className="flex flex-wrap items-center gap-2 rounded-2xl border border-white/15 bg-black p-3">
        <span className={cn("inline-flex items-center gap-1.5 text-xs font-bold", online ? "text-emerald-400" : "text-rose-400")}>
          <span className={cn("size-2.5 rounded-full", online ? "animate-pulse bg-emerald-400" : "bg-rose-500")} />
          {online ? "실시간 연결됨" : "연결 끊김 · 다시 시도 중"}
        </span>
        {(Object.keys(counts) as DealerStatus[]).map((status) => (
          <span key={status} className="inline-flex items-center gap-1 text-sm font-bold">
            <StatusChip status={status} /> {counts[status]}
          </span>
        ))}
        <span className="text-sm text-zinc-400">· 딜러 {state.dealers.length}/{MAX_DEALERS}</span>
        <label className="ml-auto inline-flex items-center gap-2 text-sm font-semibold">
          테이블
          <select
            className="h-10 rounded-lg border border-white/20 bg-zinc-900 px-2 text-base font-bold"
            value={state.tableCount}
            disabled={busy}
            onChange={(event) => void send({ type: "setTableCount", tableCount: Number(event.target.value) })}
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
          disabled={busy}
          onClick={() => {
            if (window.confirm("새 근무일을 시작할까요? 모든 딜러가 '휴무'가 되고 근무·휴식 시간 집계가 0부터 다시 시작합니다.")) {
              void send({ type: "newDay" });
            }
          }}
          className="min-h-10 rounded-lg border border-white/25 px-3 text-sm font-bold hover:bg-white/10"
        >
          새 근무일 시작
        </button>
      </section>

      {error ? <p className="rounded-lg bg-rose-950 px-3 py-2 text-sm font-bold text-rose-200">{error}</p> : null}

      {/* 테이블 */}
      <section aria-label="테이블" className="grid gap-2">
        <h2 className="text-lg font-black">
          테이블 {selected ? <span className="text-sm font-bold text-amber-300">· {selected.name} 딜러를 보낼 테이블을 누르세요</span> : null}
        </h2>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-8">
          {tables.map((tableNo) => {
            const dealer = byTable.get(tableNo);
            const target = Boolean(selectedDealer);
            return (
              <button
                key={tableNo}
                type="button"
                data-table={tableNo}
                disabled={busy}
                onClick={() => void onTable(tableNo)}
                className={cn(
                  "flex min-h-24 flex-col items-start justify-between rounded-xl border-2 p-2 text-left transition-colors",
                  dealer ? "border-emerald-500 bg-emerald-950" : "border-dashed border-white/25 bg-zinc-950",
                  selectedTable === tableNo && "ring-4 ring-amber-300",
                  target && "hover:border-amber-300",
                )}
              >
                <span className="text-xs font-black text-zinc-400">T{tableNo}</span>
                {dealer ? (
                  <>
                    <span className="w-full truncate text-lg font-black leading-tight text-white">{dealer.name}</span>
                    <span className="text-xs font-bold text-emerald-300">{formatSince(now - new Date(dealer.statusSince).getTime())}째</span>
                  </>
                ) : (
                  <span className="text-sm font-bold text-zinc-500">비어 있음</span>
                )}
              </button>
            );
          })}
        </div>
        {selectedTable ? (
          <p className="flex flex-wrap items-center gap-2 text-sm font-bold text-amber-300">
            T{selectedTable} 선택됨 · 아래 딜러를 누르면 배정됩니다.
            {byTable.get(selectedTable) ? (
              <button
                type="button"
                className="rounded-md border border-amber-300/60 px-2 py-1 text-xs"
                onClick={() => {
                  void send({ type: "clearTable", tableNo: selectedTable });
                  setSelectedTable(null);
                }}
              >
                이 테이블 비우기(딜러 휴식)
              </button>
            ) : null}
            <button type="button" className="rounded-md border border-white/30 px-2 py-1 text-xs text-white" onClick={() => setSelectedTable(null)}>
              선택 해제
            </button>
          </p>
        ) : null}
      </section>

      {/* 딜러 */}
      <section aria-label="딜러" className="grid gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-black">딜러</h2>
          {(["ALL", "WORKING", "BREAK", "OFF", "LEFT"] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={cn(
                "min-h-9 rounded-full px-3 text-xs font-bold",
                filter === key ? "bg-white text-black" : "border border-white/25 text-zinc-300",
              )}
            >
              {key === "ALL" ? "전체" : STATUS_LABEL[key]}
            </button>
          ))}
        </div>
        {state.dealers.length === 0 ? (
          <p className="rounded-xl border border-dashed border-white/25 p-4 text-sm text-zinc-400">아래에서 딜러를 등록하세요.</p>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {visibleDealers.map((dealer) => {
              const total = totals.get(dealer.id) ?? { work: 0, rest: 0 };
              return (
                <button
                  key={dealer.id}
                  type="button"
                  data-dealer={dealer.name}
                  disabled={busy}
                  onClick={() => void onDealer(dealer)}
                  className={cn(
                    "grid gap-1 rounded-xl border-2 bg-zinc-950 p-2 text-left",
                    selectedDealer === dealer.id ? "border-amber-300 ring-4 ring-amber-300/40" : "border-white/15 hover:border-white/40",
                  )}
                >
                  <span className="flex items-center justify-between gap-1">
                    <span className="truncate text-base font-black">{dealer.name}</span>
                    <StatusChip status={dealer.status} />
                  </span>
                  <span className="text-xs font-semibold text-zinc-300">
                    {dealer.status === "WORKING" && dealer.tableNo ? `T${dealer.tableNo} · ` : ""}
                    {formatSince(now - new Date(dealer.statusSince).getTime())}
                    {dealer.startTime ? ` · 출근 ${dealer.startTime}` : ""}
                  </span>
                  <span className="text-[11px] text-zinc-400">
                    근무 {formatDuration(total.work)} · 휴식 {formatDuration(total.rest)}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* 오늘 타임라인 */}
      <section aria-label="타임라인" className="grid gap-2">
        <h2 className="text-lg font-black">오늘 타임라인</h2>
        <div className="flex flex-wrap gap-3 text-xs font-bold text-zinc-300">
          {(Object.keys(BAR) as DealerStatus[]).map((status) => (
            <span key={status} className="inline-flex items-center gap-1">
              <span className={cn("size-3 rounded-sm", BAR[status])} /> {STATUS_LABEL[status]}
            </span>
          ))}
        </div>
        <div className="grid gap-1 rounded-xl border border-white/15 bg-black p-2">
          {state.dealers.map((dealer) => {
            const segments = dealerSegments(state.events, dealer.id, now, dayStart);
            if (!segments.length) return null;
            return (
              <div key={dealer.id} className="grid grid-cols-[5rem_1fr] items-center gap-2">
                <span className="truncate text-xs font-bold">{dealer.name}</span>
                <div className="relative h-6 overflow-hidden rounded bg-zinc-900">
                  {segments.map((segment, i) => (
                    <span
                      key={i}
                      title={`${STATUS_LABEL[segment.status]}${segment.tableNo ? ` T${segment.tableNo}` : ""} · ${formatSince(segment.to - segment.from)}`}
                      className={cn("absolute inset-y-0 flex items-center justify-center overflow-hidden text-[10px] font-black text-black", BAR[segment.status])}
                      style={{ left: `${((segment.from - firstEvent) / span) * 100}%`, width: `${Math.max(0.4, ((segment.to - segment.from) / span) * 100)}%` }}
                    >
                      {segment.tableNo ? `T${segment.tableNo}` : ""}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
          {state.events.length === 0 ? <p className="text-xs text-zinc-500">배정을 시작하면 딜러별 근무·휴식 흐름이 그려집니다.</p> : null}
        </div>
      </section>

      {/* 딜러 등록 */}
      <section aria-label="딜러 등록" className="grid gap-2 rounded-2xl border border-white/15 bg-zinc-950 p-3">
        <h2 className="text-lg font-black">딜러 등록</h2>
        <p className="text-xs text-zinc-400">한 줄에 한 명 · 출근 시간은 선택 (예: 김딜러 18:00). 최대 {MAX_DEALERS}명.</p>
        <textarea
          value={bulk}
          onChange={(event) => setBulk(event.target.value)}
          rows={4}
          className="rounded-lg border border-white/20 bg-black p-2 text-base"
          placeholder={"김딜러 18:00\n이딜러 19:30\n박딜러"}
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

      {/* 선택한 딜러 작업 막대 */}
      {selected ? (
        <div data-action-bar className="fixed inset-x-0 bottom-0 z-50 border-t-2 border-amber-300 bg-black/95 p-3 backdrop-blur">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-2">
            <span className="text-base font-black">
              {selected.name} <StatusChip status={selected.status} />
            </span>
            <span className="text-xs text-amber-300">테이블을 누르면 배정</span>
            <div className="ml-auto flex flex-wrap gap-2">
              {(["BREAK", "OFF", "LEFT"] as const).map((status) => (
                <button
                  key={status}
                  type="button"
                  disabled={busy}
                  onClick={async () => {
                    if (await send({ type: "setStatus", id: selected.id, status })) setSelectedDealer(null);
                  }}
                  className={cn("min-h-11 rounded-lg px-4 text-sm font-black", CHIP[status])}
                >
                  {STATUS_LABEL[status]}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setEditing({ id: selected.id, name: selected.name, startTime: selected.startTime ?? "" })}
                className="min-h-11 rounded-lg border border-white/30 px-3 text-sm font-bold"
              >
                수정
              </button>
              <button type="button" onClick={() => setSelectedDealer(null)} className="min-h-11 rounded-lg border border-white/30 px-3 text-sm font-bold">
                닫기
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* 수정 창 */}
      {editing ? (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-black/70 p-4" role="dialog" aria-label="딜러 수정">
          <div className="grid w-full max-w-sm gap-3 rounded-2xl border border-white/20 bg-zinc-950 p-4">
            <h3 className="text-lg font-black">딜러 수정</h3>
            <label className="grid gap-1 text-sm font-bold">
              이름
              <input
                value={editing.name}
                onChange={(event) => setEditing({ ...editing, name: event.target.value })}
                className="h-11 rounded-lg border border-white/20 bg-black px-2 text-base"
              />
            </label>
            <label className="grid gap-1 text-sm font-bold">
              출근 시간
              <input
                value={editing.startTime}
                placeholder="18:00"
                onChange={(event) => setEditing({ ...editing, startTime: event.target.value })}
                className="h-11 rounded-lg border border-white/20 bg-black px-2 text-base"
              />
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
                  if (window.confirm(`${editing.name} 딜러를 삭제할까요? 오늘 기록도 함께 지워집니다.`)) {
                    if (await send({ type: "removeDealer", id: editing.id })) {
                      setEditing(null);
                      setSelectedDealer(null);
                    }
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
