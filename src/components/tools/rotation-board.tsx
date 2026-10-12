"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "cn";
import {
  INTERVAL_CHOICES,
  MAX_DEALERS,
  STATUS_LABEL,
  formatTableLabels,
  kstClock,
  nowMinutes,
  parseDealerLines,
  parseTableLabels,
  planDealers,
  type DealerStatus,
  type RotationAction,
  type RotationStateView,
} from "@/lib/rotation";
import { buildPlan, dealerSchedule, formatClock, parseClock, slotIndexAt, swapInSlot, type RotationPlan } from "@/lib/rotation-plan";
import { downloadDealerImage, downloadTimeImage, timeSheetText } from "@/components/tools/rotation-export";

/** 다른 기기 변경 확인 간격 */
const POLL_MS = 2000;
/** 시간표에서 최소로 보여 줄 줄 수 */
const MIN_ROWS = 4;
const SETUP_CHOICES = [0, 15, 30, 45, 60] as const;

const CHIP: Record<DealerStatus, string> = {
  WAIT: "bg-zinc-600 text-white",
  IN: "bg-emerald-500 text-black",
  OFF: "bg-rose-500 text-white",
  LEFT: "bg-slate-500 text-white",
};

function StatusChip({ status }: { status: DealerStatus }) {
  return <span className={cn("rounded px-1 py-0.5 text-[10px] font-black whitespace-nowrap", CHIP[status])}>{STATUS_LABEL[status]}</span>;
}

function untilLabel(minutes: number) {
  if (minutes <= 0) return "지금";
  if (minutes < 60) return `${minutes}분 후`;
  return `${Math.floor(minutes / 60)}시간 ${minutes % 60}분 후`;
}

/**
 * 딜러 로테이션(시간표). 게임 시작·끝 시각, 간격, 세팅 칸, 테이블 번호를 정하고 "로테이션 짜기"를 누르면
 * 칸마다 누가 몇 번 테이블에 들어가고 누가 쉬는지 미리 짜 줍니다.
 * 2초마다 다른 기기 변경을 확인해 새로고침 없이 반영합니다.
 */
export function RotationBoard({ initial }: { initial: RotationStateView }) {
  const [state, setState] = useState(initial);
  const [clock, setClock] = useState(() => new Date());
  const [error, setError] = useState<string | null>(null);
  const [online, setOnline] = useState(true);
  const [busy, setBusy] = useState(false);
  const [bulk, setBulk] = useState("");
  const [labelsText, setLabelsText] = useState(() => formatTableLabels(initial.tableLabels));
  const [editing, setEditing] = useState<{ id: string; name: string; startTime: string } | null>(null);
  const [cell, setCell] = useState<{ slot: number; table: number } | null>(null);
  const [view, setView] = useState<"table" | "dealer">("table");
  const [showAll, setShowAll] = useState(false);
  const [copied, setCopied] = useState(false);
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
      setLabelsText(formatTableLabels(data.state.tableLabels));
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
  const labels = state.tableLabels;
  const plan = state.plan && state.plan.tables === state.tableCount ? state.plan : null;
  const names = useMemo(() => new Map(state.dealers.map((d) => [d.id, d.name])), [state.dealers]);
  const name = useCallback((id: string | null) => (id ? (names.get(id) ?? "(삭제됨)") : ""), [names]);
  const { current, next } = plan ? slotIndexAt(plan, now) : { current: -1, next: -1 };
  const slotLabel = useCallback((index: number) => (plan && index === 0 && (plan.setup ?? 0) > 0 ? "세팅" : null), [plan]);

  const counts = useMemo(() => {
    const c: Record<DealerStatus, number> = { WAIT: 0, IN: 0, OFF: 0, LEFT: 0 };
    for (const dealer of state.dealers) c[dealer.status] += 1;
    return c;
  }, [state.dealers]);

  // 출근했는데 남은 시간표에 없는 딜러 / 퇴근·휴무인데 남은 시간표에 있는 딜러 → 다시 짜기 안내
  const future = plan ? plan.slots.slice(Math.max(0, current + 1)) : [];
  const futureAll = new Set(future.flatMap((s) => [...s.seats, ...s.rest]));
  const futureSeats = new Set(future.flatMap((s) => s.seats));
  // 다음 칸이나 마지막 칸에 없으면(한 칸만 손으로 넣은 경우 포함) 다시 짜기를 안내합니다.
  const inSlot = (slot: RotationPlan["slots"][number] | undefined, id: string) => Boolean(slot && (slot.seats.includes(id) || slot.rest.includes(id)));
  const missing = future.length
    ? state.dealers.filter((d) => d.status === "IN" && (!futureAll.has(d.id) || !inSlot(future[0], d.id) || !inSlot(future[future.length - 1], d.id)))
    : [];
  const leftInPlan = state.dealers.filter((d) => (d.status === "LEFT" || d.status === "OFF") && futureSeats.has(d.id));

  function makePlan(fromNow: boolean) {
    const keep = fromNow && plan ? plan.slots.filter((_, index) => index <= current) : [];
    const built = buildPlan({
      dealers: planDealers(state.dealers, start),
      tables: state.tableCount,
      start,
      end,
      interval: state.interval,
      setup: state.setupMinutes,
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

  const changes = useMemo(() => {
    if (!plan || next < 0) return null;
    const before = current >= 0 ? plan.slots[current] : null;
    const after = plan.slots[next];
    const moves = after.seats
      .map((id, table) => ({ table: labels[table], id, prev: before?.seats[table] ?? null }))
      .filter((row) => row.id !== row.prev && row.id);
    const toRest = after.rest.filter((id) => !before?.rest.includes(id));
    return { at: after.at, moves, toRest };
  }, [plan, current, next, labels]);

  // 보여 줄 줄: 지금 칸부터, 최소 4줄(뒤가 모자라면 앞 칸까지)
  const rows = useMemo(() => {
    if (!plan) return [];
    const all = plan.slots.map((slot, index) => ({ slot, index }));
    if (showAll) return all;
    let from = Math.max(0, current);
    if (all.length - from < MIN_ROWS) from = Math.max(0, all.length - MIN_ROWS);
    return all.slice(from);
  }, [plan, current, showAll]);
  const rowIndexes = rows.map((r) => r.index);

  const endPassed = Boolean(plan && plan.slots.length > 0 && now >= plan.slots[plan.slots.length - 1].at + plan.interval);
  const parsedLabels = parseTableLabels(labelsText);

  // 칸 바꾸기 후보: 그 시각에 일할 수 있는 모든 딜러(휴무·그 시각 전 퇴근 제외)
  const candidates = useMemo(() => {
    if (!plan || !cell) return null;
    const slot = plan.slots[cell.slot];
    const available = new Set(planDealers(state.dealers, start).filter((d) => d.to == null || d.to > slot.at).map((d) => d.id));
    const resting = slot.rest.filter((id) => names.has(id));
    const seated = slot.seats
      .map((id, t) => ({ id, t }))
      .filter((row): row is { id: string; t: number } => Boolean(row.id) && row.t !== cell.table);
    const inSlot = new Set([...slot.seats, ...slot.rest]);
    const outside = state.dealers.filter((d) => available.has(d.id) && !inSlot.has(d.id));
    return { slot, resting, seated, outside };
  }, [plan, cell, state.dealers, start, names]);

  return (
    <div className="grid gap-3 pb-10 text-white">
      {/* 설정 */}
      <section className="grid gap-2 rounded-2xl border border-white/15 bg-black p-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className={cn("inline-flex items-center gap-1.5 text-xs font-bold", online ? "text-emerald-400" : "text-rose-400")}>
            <span className={cn("size-2.5 rounded-full", online ? "animate-pulse bg-emerald-400" : "bg-rose-500")} />
            {online ? "실시간 연결됨" : "연결 끊김 · 다시 시도 중"}
          </span>
          <span className="text-sm font-black text-amber-300">지금 {kstClock(clock)}</span>
          {(Object.keys(counts) as DealerStatus[]).map((status) => (
            <span key={status} className="inline-flex items-center gap-1 text-xs font-bold">
              <StatusChip status={status} /> {counts[status]}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <label className="grid gap-1 text-xs font-bold text-zinc-300">
            게임 시작
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
            시작 전 세팅 칸
            <select
              value={state.setupMinutes}
              disabled={busy}
              onChange={(e) => void send({ type: "setSettings", setupMinutes: Number(e.target.value) })}
              className="h-11 rounded-lg border border-white/20 bg-zinc-900 px-2 text-base font-bold"
            >
              {SETUP_CHOICES.map((n) => (
                <option key={n} value={n}>
                  {n ? `${n}분 전부터` : "없음"}
                </option>
              ))}
            </select>
          </label>
          <label className="col-span-2 grid gap-1 text-xs font-bold text-zinc-300 sm:col-span-4">
            테이블 번호 ({state.tableCount}개) · 예: 5-12, 15
            <span className="flex gap-1.5">
              <input
                value={labelsText}
                onChange={(e) => setLabelsText(e.target.value)}
                className="h-11 min-w-0 flex-1 rounded-lg border border-white/20 bg-zinc-900 px-2 text-base font-bold text-white"
              />
              <button
                type="button"
                disabled={busy || labelsText === formatTableLabels(labels) || parsedLabels.labels.length === 0}
                onClick={() => {
                  if (parsedLabels.labels.length !== state.tableCount && plan && !window.confirm("테이블 수가 바뀌면 시간표를 다시 짜야 합니다. 바꿀까요?")) return;
                  void send({ type: "setSettings", tableLabels: labelsText });
                }}
                className="min-h-11 rounded-lg border border-white/30 px-3 text-sm font-bold disabled:opacity-40"
              >
                적용
              </button>
            </span>
            {parsedLabels.errors.length ? <span className="text-rose-300">못 읽은 값: {parsedLabels.errors.join(", ")}</span> : null}
          </label>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy || state.dealers.length === 0}
            onClick={() => {
              if (!plan || window.confirm("시간표를 처음부터 새로 짤까요? 손으로 바꾼 칸도 다시 짜집니다.")) makePlan(false);
            }}
            className="min-h-11 rounded-lg bg-amber-400 px-5 text-base font-black text-black disabled:opacity-40"
          >
            로테이션 짜기
          </button>
          {plan ? (
            <button type="button" disabled={busy} onClick={() => makePlan(true)} className="min-h-11 rounded-lg border-2 border-amber-400 px-4 text-sm font-black text-amber-300">
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
            className="ml-auto min-h-11 rounded-lg border border-white/25 px-3 text-sm font-bold hover:bg-white/10"
          >
            새 근무일
          </button>
        </div>
      </section>

      {error ? <p className="rounded-lg bg-rose-950 px-3 py-2 text-sm font-bold text-rose-200">{error}</p> : null}

      {/* 다시 짜기 안내 */}
      {missing.length || leftInPlan.length || endPassed ? (
        <section aria-label="다시 짜기 안내" className="flex flex-wrap items-center gap-2 rounded-xl border-2 border-rose-500 bg-rose-950/50 p-3 text-sm font-bold">
          <span className="text-rose-200">
            {missing.length ? `출근한 ${missing.map((d) => d.name).join(", ")} 딜러가 남은 시간표에 빠져 있습니다. ` : ""}
            {leftInPlan.length ? `퇴근·휴무인 ${leftInPlan.map((d) => d.name).join(", ")} 딜러가 남은 시간표에 있습니다. ` : ""}
            {endPassed ? `시간표 끝(${formatClock(end)})이 지났습니다. 끝 시각을 늘리고 다시 짜세요.` : ""}
          </span>
          {!endPassed ? (
            <button type="button" disabled={busy} onClick={() => makePlan(true)} className="ml-auto min-h-10 rounded-lg bg-amber-400 px-3 text-sm font-black text-black">
              지금 이후 다시 짜기
            </button>
          ) : null}
        </section>
      ) : null}

      {/* 다음 교대 */}
      {plan && changes ? (
        <section aria-label="다음 교대" className="grid gap-2 rounded-2xl border-2 border-amber-400 bg-amber-950/30 p-3">
          <p className="flex flex-wrap items-baseline gap-2">
            <span className="text-2xl font-black text-amber-300">다음 교대 {formatClock(changes.at)}</span>
            <span className="text-sm font-bold text-amber-100">{untilLabel(changes.at - now)}</span>
          </p>
          <ul className="flex flex-wrap gap-1.5">
            {changes.moves.map((move) => (
              <li key={move.table} className="rounded-lg bg-black px-2.5 py-1.5 text-base font-black">
                <span className="text-amber-300">{formatClock(changes.at)}</span> <span className="text-emerald-300">T{move.table}</span> {name(move.id)}
              </li>
            ))}
            {changes.toRest.length ? (
              <li className="rounded-lg bg-amber-400 px-2.5 py-1.5 text-base font-black text-black">휴식 {changes.toRest.map(name).join(", ")}</li>
            ) : null}
          </ul>
        </section>
      ) : null}

      {/* 시간표 */}
      <section aria-label="시간표" className="grid gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-xl font-black">로테이션 시간표</h2>
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
                    {key === "table" ? "시간별" : "딜러별"}
                  </button>
                ))}
              </div>
              <label className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-300">
                <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} className="size-4" />
                전체 보기(지난 칸 포함)
              </label>
              <div className="ml-auto flex flex-wrap gap-1.5">
                <button type="button" onClick={() => downloadTimeImage(plan, labels, name, rowIndexes, slotLabel)} className="min-h-9 rounded-lg bg-white px-3 text-xs font-black text-black">
                  시간별 이미지 저장
                </button>
                <button
                  type="button"
                  onClick={() => downloadDealerImage(plan, labels, state.dealers.filter((d) => d.status !== "OFF"), rowIndexes, slotLabel)}
                  className="min-h-9 rounded-lg bg-white px-3 text-xs font-black text-black"
                >
                  딜러별 이미지 저장
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await navigator.clipboard.writeText(timeSheetText(plan, labels, name, rowIndexes, slotLabel)).catch(() => undefined);
                    setCopied(true);
                    window.setTimeout(() => setCopied(false), 1500);
                  }}
                  className="min-h-9 rounded-lg bg-[#FEE500] px-3 text-xs font-black text-black"
                >
                  {copied ? "복사됨 ✓" : "단톡방 텍스트"}
                </button>
              </div>
            </>
          ) : null}
        </div>

        {!plan ? (
          <p className="rounded-xl border border-dashed border-white/25 p-4 text-sm text-zinc-300">
            {state.plan ? "테이블 수가 바뀌어 시간표를 다시 짜야 합니다. " : ""}
            딜러를 등록하고 게임 시작·끝, 간격, 테이블 번호를 정한 뒤 <b className="text-amber-300">로테이션 짜기</b>를 누르세요.
          </p>
        ) : view === "table" ? (
          <div className="max-h-[78dvh] overflow-auto rounded-xl border border-white/15">
            <table className="min-w-full border-collapse">
              <thead className="sticky top-0 z-20 bg-zinc-900">
                <tr>
                  <th className="sticky left-0 z-30 bg-zinc-900 px-2 py-2 text-left text-sm font-black text-zinc-300">시각</th>
                  {labels.map((label) => (
                    <th key={label} className="px-1 py-2 text-base font-black text-emerald-300">
                      T{label}
                    </th>
                  ))}
                  <th className="px-2 py-2 text-left text-sm font-black text-amber-300">휴식</th>
                  <th className="px-2 py-2 text-sm font-black text-zinc-300">시각</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ slot, index }) => {
                  const time = formatClock(slot.at);
                  return (
                    <tr
                      key={slot.at}
                      data-slot={time}
                      className={cn(
                        "border-t-2 border-white/10",
                        index === current ? "bg-emerald-950" : index === next ? "bg-[#2a1d05]" : "bg-black",
                        index < current && "opacity-50",
                      )}
                    >
                      <th className="sticky left-0 z-10 bg-inherit px-2 py-2 text-left whitespace-nowrap">
                        <span className={cn("block text-xl font-black", index === current ? "text-emerald-300" : index === next ? "text-amber-300" : "text-white")}>
                          {time}
                        </span>
                        <span className="block text-[11px] font-bold text-zinc-400">{slotLabel(index) ?? (index === current ? "지금" : index === next ? "다음" : "")}</span>
                      </th>
                      {slot.seats.map((id, t) => (
                        <td key={t} className="px-1 py-1.5">
                          <button
                            type="button"
                            data-cell={`${time}-T${labels[t]}`}
                            onClick={() => setCell({ slot: index, table: t })}
                            className={cn(
                              "grid w-full min-w-[5.5rem] gap-0.5 rounded-lg px-1.5 py-1.5 text-center",
                              id ? "bg-zinc-800 hover:bg-zinc-700" : "border-2 border-dashed border-rose-500/70",
                              cell?.slot === index && cell.table === t && "ring-2 ring-amber-300",
                            )}
                          >
                            <span className="text-[10px] font-black text-emerald-300">
                              {time} · T{labels[t]}
                            </span>
                            <span className={cn("truncate text-base font-black", id ? "text-white" : "text-rose-300")}>{id ? name(id) : "비어 있음"}</span>
                          </button>
                        </td>
                      ))}
                      <td className="px-2 py-1.5 text-sm font-bold text-amber-200">{slot.rest.map(name).join(", ") || "—"}</td>
                      <td className="px-2 py-1.5 text-base font-black whitespace-nowrap text-zinc-300">{time}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid gap-1.5">
            {state.dealers
              .filter((d) => d.status !== "OFF")
              .map((dealer) => {
                const visible = new Set(rowIndexes);
                const schedule = dealerSchedule(plan, dealer.id)
                  .map((row, index) => ({ ...row, index }))
                  .filter((row) => visible.has(row.index));
                return (
                  <div key={dealer.id} data-schedule={dealer.name} className="grid gap-1.5 rounded-xl border border-white/15 bg-zinc-950 p-2 sm:grid-cols-[7rem_1fr] sm:items-center">
                    <p className="flex items-center gap-1.5 text-base font-black">
                      {dealer.name} <StatusChip status={dealer.status} />
                    </p>
                    <ul className="flex flex-wrap gap-1">
                      {schedule.map((row) => (
                        <li
                          key={row.at}
                          className={cn(
                            "rounded-md px-2 py-1 text-sm font-black",
                            row.table == null ? "bg-zinc-900 text-zinc-600" : row.table === 0 ? "bg-amber-400 text-black" : "bg-emerald-600 text-white",
                            row.index === current && "ring-2 ring-white",
                          )}
                        >
                          {formatClock(row.at)} {row.table == null ? "—" : row.table === 0 ? "휴식" : `T${labels[row.table - 1]}`}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
          </div>
        )}
      </section>

      {/* 딜러 · 출근 체크(작게) */}
      <section aria-label="딜러" className="grid gap-2">
        <h2 className="text-base font-black text-zinc-200">딜러 · 출근 체크</h2>
        {state.dealers.length === 0 ? (
          <p className="rounded-xl border border-dashed border-white/25 p-3 text-sm text-zinc-400">아래에서 딜러를 등록하세요.</p>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,19.5rem),1fr))] gap-1">
            {state.dealers.map((dealer) => (
              <div key={dealer.id} data-dealer={dealer.name} className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-zinc-950 px-2 py-1">
                <button
                  type="button"
                  onClick={() => setEditing({ id: dealer.id, name: dealer.name, startTime: dealer.startTime ?? "" })}
                  className="min-w-0 flex-1 truncate text-left text-sm font-black hover:underline"
                >
                  {dealer.name}
                </button>
                <span className="text-[10px] text-zinc-400 tabular-nums">
                  {dealer.checkedInAt ? <b className="text-emerald-300">{kstClock(dealer.checkedInAt)}</b> : (dealer.startTime ?? "")}
                </span>
                <StatusChip status={dealer.status} />
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void send({ type: "checkIn", id: dealer.id })}
                  className={cn("min-h-8 rounded px-2 text-xs font-black", dealer.status === "IN" ? "bg-emerald-900 text-emerald-300" : "bg-emerald-500 text-black")}
                >
                  출근
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void send({ type: "setStatus", id: dealer.id, status: dealer.status === "OFF" ? "WAIT" : "OFF" })}
                  className="min-h-8 rounded bg-rose-600 px-2 text-xs font-black text-white"
                >
                  {dealer.status === "OFF" ? "취소" : "휴무"}
                </button>
                <button
                  type="button"
                  disabled={busy || dealer.status === "LEFT"}
                  onClick={() => void send({ type: "setStatus", id: dealer.id, status: "LEFT" })}
                  className="min-h-8 rounded bg-slate-500 px-2 text-xs font-black text-white disabled:opacity-40"
                >
                  퇴근
                </button>
              </div>
            ))}
          </div>
        )}
        <details className="rounded-xl border border-white/15 bg-zinc-950 p-2" open={state.dealers.length === 0}>
          <summary className="min-h-9 cursor-pointer text-sm font-bold text-zinc-200">딜러 등록 (한 줄에 한 명 · 예: 김딜러 10:00 · 최대 {MAX_DEALERS}명)</summary>
          <div className="mt-2 grid gap-2">
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
              className="min-h-10 justify-self-start rounded-lg bg-emerald-500 px-4 text-sm font-black text-black disabled:opacity-40"
            >
              {parseDealerLines(bulk).length || ""}명 등록
            </button>
          </div>
        </details>
      </section>

      {/* 칸 바꾸기 */}
      {plan && cell && candidates ? (
        <div className="fixed inset-0 z-[60] grid place-items-end bg-black/70 p-3 sm:place-items-center" role="dialog" aria-label="칸 바꾸기">
          <div className="grid max-h-[85dvh] w-full max-w-lg gap-3 overflow-y-auto rounded-2xl border border-white/20 bg-zinc-950 p-4">
            <h3 className="text-lg font-black">
              {formatClock(candidates.slot.at)} · T{labels[cell.table]}{" "}
              <span className="text-sm text-zinc-400">지금: {name(candidates.slot.seats[cell.table]) || "비어 있음"}</span>
            </h3>
            <p className="text-xs text-zinc-400">이 칸만 바뀝니다. 다른 테이블 딜러를 고르면 자리를 맞바꾸고, 지금 딜러는 휴식으로 갑니다.</p>
            {candidates.resting.length ? (
              <div className="grid gap-1">
                <p className="text-xs font-bold text-amber-300">휴식 중</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {candidates.resting.map((id) => (
                    <button key={id} type="button" onClick={() => changeCell(id)} className="min-h-11 rounded-lg bg-amber-400 px-2 text-sm font-black text-black">
                      {name(id)}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
            {candidates.outside.length ? (
              <div className="grid gap-1">
                <p className="text-xs font-bold text-emerald-300">시간표에 없는 딜러(새로 넣기)</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {candidates.outside.map((dealer) => (
                    <button key={dealer.id} type="button" onClick={() => changeCell(dealer.id)} className="min-h-11 rounded-lg bg-emerald-600 px-2 text-sm font-black text-white">
                      {dealer.name} <span className="text-[10px]">{STATUS_LABEL[dealer.status]}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
            {candidates.seated.length ? (
              <div className="grid gap-1">
                <p className="text-xs font-bold text-zinc-300">다른 테이블과 맞바꾸기</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {candidates.seated.map(({ id, t }) => (
                    <button key={id} type="button" onClick={() => changeCell(id)} className="min-h-11 rounded-lg bg-zinc-800 px-2 text-sm font-bold">
                      {name(id)} <span className="text-[10px] text-zinc-400">T{labels[t]}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
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
