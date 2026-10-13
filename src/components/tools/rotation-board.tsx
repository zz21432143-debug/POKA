"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "cn";
import {
  INTERVAL_CHOICES,
  MAX_DEALERS,
  MAX_TABLES,
  STATUS_LABEL,
  closedFromOf,
  formatTableLabels,
  formatWorkDate,
  kstClock,
  kstDate,
  nowMinutes,
  parseDealerLines,
  parseTableLabels,
  planDealers,
  type DealerStatus,
  type RotationAction,
  type RotationStateView,
} from "@/lib/rotation";
import {
  EXTEND_WHEN_LEFT,
  PLAN_HORIZON,
  alignToStart,
  autoArrange,
  buildPlan,
  dealerSchedule,
  extendPlan,
  formatClock,
  parseClock,
  retimeFrom,
  slotIndexAt,
  swapInSlot,
  type RotationPlan,
} from "@/lib/rotation-plan";
import { downloadDealerSwapImage, downloadSwapImage, swapInfo, swapText } from "@/components/tools/rotation-export";

/** 다른 기기 변경 확인 간격 */
const POLL_MS = 2000;
/** 시간표에서 기본으로 보여 줄 칸 수(바로 앞 칸 1개 + 지금 + 다음 …) */
const VISIBLE_COLS = 12;
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


/** "2026-10-13" 다음 날 */
function nextDate(value: string) {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
}

type GameDialog = { mode: "new" | "day" | "edit"; name: string; workDate: string; copyDealers: boolean; copySettings: boolean };

/** 접었다 펴는 칸의 머리: 화살표 + "눌러서 펼치기/접기" */
function FoldHead({ children }: { children: React.ReactNode }) {
  return (
    <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-xl text-sm font-bold text-zinc-100 hover:bg-white/5 [&::-webkit-details-marker]:hidden">
      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-amber-400 text-xs font-black text-black transition-transform group-open:rotate-90">▶</span>
      <span className="min-w-0 flex-1">{children}</span>
      <span className="shrink-0 rounded-full border border-amber-400/60 px-2 py-0.5 text-[11px] font-black text-amber-300 group-open:hidden">눌러서 펼치기</span>
      <span className="hidden shrink-0 rounded-full border border-white/25 px-2 py-0.5 text-[11px] font-black text-zinc-300 group-open:inline">접기</span>
    </summary>
  );
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
  const [times, setTimes] = useState<{ id: string; name: string; start: string; end: string; startReal: boolean; endReal: boolean } | null>(null);
  const [cell, setCell] = useState<{ slot: number; table: number } | null>(null);
  const [timeEdit, setTimeEdit] = useState<{ index: number; value: string } | null>(null);
  const [view, setView] = useState<"table" | "dealer">("table");
  const [showAll, setShowAll] = useState(false);
  const [copied, setCopied] = useState(false);
  const [gameDialog, setGameDialog] = useState<GameDialog | null>(null);
  const versionRef = useRef(initial.version);
  // 지금 보고 있는 게임(주소 ?g= 와 같이 움직임)
  const gameRef = useRef(initial.game.id);

  useEffect(() => {
    let alive = true;
    const poll = async () => {
      if (document.hidden) return;
      try {
        const response = await fetch(`/api/tools/rotation?g=${encodeURIComponent(gameRef.current)}&v=${versionRef.current}`, { cache: "no-store" });
        const data = (await response.json()) as { changed?: boolean; state?: RotationStateView };
        if (!alive) return;
        setOnline(response.ok);
        // 게임을 바꾸는 사이 늦게 온 이전 게임 응답은 버립니다.
        if (data.changed && data.state && data.state.game.id === gameRef.current) {
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

  /** 받은 상태 보여 주기. 게임이 바뀌었으면(새 게임·삭제) 주소도 바꿉니다. */
  const showState = useCallback((next: RotationStateView) => {
    versionRef.current = next.version;
    if (next.game.id !== gameRef.current) {
      gameRef.current = next.game.id;
      window.history.replaceState(null, "", `?g=${encodeURIComponent(next.game.id)}`);
    }
    setState(next);
    setLabelsText(formatTableLabels(next.tableLabels));
  }, []);

  /** 다른 게임 보기 */
  async function switchGame(id: string) {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/tools/rotation?g=${encodeURIComponent(id)}`, { cache: "no-store" });
      const data = (await response.json()) as { state?: RotationStateView; error?: string };
      if (!response.ok || !data.state) throw new Error(data.error ?? "게임을 불러오지 못했습니다.");
      setCell(null);
      setTimes(null);
      showState(data.state);
    } catch (err) {
      setError(err instanceof Error ? err.message : "게임을 불러오지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }

  async function saveGame() {
    if (!gameDialog) return;
    const ok =
      gameDialog.mode === "edit"
        ? await send({ type: "setGame", name: gameDialog.name, workDate: gameDialog.workDate })
        : await send({
            type: "createGame",
            name: gameDialog.name,
            workDate: gameDialog.workDate,
            copyDealers: gameDialog.copyDealers,
            copySettings: gameDialog.copySettings,
          });
    if (ok) setGameDialog(null);
  }

  const send = useCallback(async (action: RotationAction) => {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/tools/rotation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ game: gameRef.current, action }),
      });
      const data = (await response.json()) as { state?: RotationStateView; error?: string };
      if (!response.ok || !data.state) throw new Error(data.error ?? "저장하지 못했습니다.");
      showState(data.state);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장하지 못했습니다.");
      return false;
    } finally {
      setBusy(false);
    }
  }, [showState]);

  const start = parseClock(state.planStart) ?? 600;
  const now = nowMinutes(start, clock);
  const labels = state.tableLabels;
  const plan = state.plan && state.plan.tables === state.tableCount ? state.plan : null;
  const names = useMemo(() => new Map(state.dealers.map((d) => [d.id, d.name])), [state.dealers]);
  const name = useCallback((id: string | null) => (id ? (names.get(id) ?? "(삭제됨)") : ""), [names]);
  const { current, next } = plan ? slotIndexAt(plan, now) : { current: -1, next: -1 };
  // 세팅 칸: 게임 시작 setup분 전 칸(지난 칸을 덜어 내도 시각으로 알아봅니다)
  const slotLabel = useCallback(
    (index: number) => (plan && (plan.setup ?? 0) > 0 && plan.slots[index]?.at === plan.start - (plan.setup ?? 0) ? "세팅" : null),
    [plan],
  );

  // 컨바인(닫은) 테이블: 그 시각부터 비워 둠
  const closedFrom = useMemo(() => closedFromOf(labels, state.tableState), [labels, state.tableState]);
  // 버튼 자리: 한 번 정하면 모든 테이블이 같습니다(테이블 상태 "0"에 저장)
  const button = state.tableState["0"]?.button ?? null;
  const isClosedAt = (t: number, at: number) => closedFrom[t] != null && at >= (closedFrom[t] as number);
  // 운영 현황(지금 칸 기준, 시작 전이면 첫 칸)
  const nowSlot = plan ? plan.slots[Math.max(0, current)] : null;
  // 이미 컨바인된(지금 칸부터 닫힌) 테이블은 시간표 줄에서 빼서 자리를 아낍니다. 다음 교대에 닫히는 테이블은 빨간색으로 남겨 둡니다.
  const hiddenTable = (t: number) => closedFrom[t] != null && (closedFrom[t] as number) <= (nowSlot?.at ?? now);
  const hiddenLabels = labels.filter((_, t) => hiddenTable(t));
  const runningLabels = labels.filter((_, t) => !isClosedAt(t, nowSlot?.at ?? now));
  const dealing = nowSlot ? nowSlot.seats.filter(Boolean).length : 0;
  const resting = nowSlot ? nowSlot.rest.length : 0;
  const onDuty = state.dealers.filter((d) => d.status !== "OFF" && d.status !== "LEFT").length;

  // 출근했는데 남은 시간표에 없는 딜러 / 퇴근·휴무인데 남은 시간표에 있는 딜러 → 다시 짜기 안내
  const future = plan ? plan.slots.slice(Math.max(0, current + 1)) : [];
  const futureAll = new Set(future.flatMap((s) => [...s.seats, ...s.rest]));
  // 다음 칸이나 마지막 칸에 없으면(한 칸만 손으로 넣은 경우 포함) 다시 짜기를 안내합니다.
  const inSlot = (slot: RotationPlan["slots"][number] | undefined, id: string) => Boolean(slot && (slot.seats.includes(id) || slot.rest.includes(id)));
  // 예정 퇴근 시각(분, 시간표 기준)
  const endAt = new Map(planDealers(state.dealers, start).map((d) => [d.id, d.to]));
  const workingAt = (id: string, at: number) => {
    const to = endAt.get(id);
    return to == null || at < to;
  };
  const missing = future.length
    ? state.dealers.filter((d) => {
        if (d.status !== "IN") return false;
        const firstAt = future[0].at;
        const lastAt = future[future.length - 1].at;
        if (!workingAt(d.id, firstAt)) return false;
        return !futureAll.has(d.id) || !inSlot(future[0], d.id) || (workingAt(d.id, lastAt) && !inSlot(future[future.length - 1], d.id));
      })
    : [];
  // 퇴근·휴무 딜러가 지금 칸부터 들어가 있거나, 예정 퇴근 시각 뒤에 들어가 있으면 빨간색
  const gone = new Map(state.dealers.filter((d) => d.status === "LEFT" || d.status === "OFF").map((d) => [d.id, d.status === "LEFT" ? "퇴근" : "휴무"]));
  const isGone = (id: string | null | undefined, index: number) => {
    if (!id || index < current || !plan?.slots[index]) return false;
    return gone.has(id) || !workingAt(id, plan.slots[index].at);
  };
  const goneLabel = (id: string) => gone.get(id) ?? "퇴근 시간";
  const leftInPlan = state.dealers.filter((d) =>
    plan ? plan.slots.some((slot, index) => index > current && (slot.seats.includes(d.id) || slot.rest.includes(d.id)) && isGone(d.id, index)) : false,
  );

  function makePlan(fromNow: boolean) {
    const keep = fromNow && plan ? plan.slots.filter((_, index) => index <= current) : [];
    // 끝 시간 없음: 지금(또는 게임 시작)부터 12시간치를 짜 두고, 남은 칸이 줄면 자동으로 이어 짭니다.
    const built = buildPlan({
      dealers: planDealers(state.dealers, start),
      tables: state.tableCount,
      start,
      end: Math.max(now, start) + PLAN_HORIZON,
      interval: state.interval,
      setup: state.setupMinutes,
      keep,
      closedFrom,
    });
    void send({ type: "savePlan", plan: built });
  }

  /** Auto: 지금 칸 빈자리(퇴근·컨바인) 채우고, 다음 칸부터 딜·휴식 시간 맞춰 다시 짬 */
  function runAuto() {
    const nowMin = nowMinutes(start, new Date());
    const leftIds = new Set(state.dealers.filter((d) => d.status === "LEFT").map((d) => d.id));
    const dealers = planDealers(state.dealers, start).map((d) => (leftIds.has(d.id) ? { ...d, to: Math.min(d.to ?? nowMin, nowMin) } : d));
    const built = autoArrange({
      plan,
      dealers,
      current,
      tables: state.tableCount,
      start,
      interval: plan?.interval ?? state.interval,
      setup: plan?.setup ?? state.setupMinutes,
      now: nowMin,
      closedFrom,
    });
    void send({ type: "savePlan", plan: built });
  }

  // 남은 칸이 적으면 같은 흐름으로 이어 짜기(한 번만)
  const extendingRef = useRef(0);
  useEffect(() => {
    if (!plan || busy) return;
    const left = plan.slots.length - Math.max(0, current) - 1;
    if (left >= EXTEND_WHEN_LEFT || extendingRef.current === state.version) return;
    extendingRef.current = state.version;
    void send({ type: "savePlan", plan: extendPlan(plan, planDealers(state.dealers, start), current, undefined, closedFrom) });
  }, [plan, busy, current, state.version, state.dealers, start, send, closedFrom]);

  /** 컨바인: 다음 교대부터 이 테이블을 닫고 남은 시간표를 다시 짭니다. 다시 열기는 지금 이후부터 다시 돌립니다. */
  async function toggleCombine(t: number) {
    const label = labels[t];
    const closing = closedFrom[t] == null;
    const at = closing ? (plan && next >= 0 ? plan.slots[next].at : now) : null;
    const message = closing
      ? `T${label} 테이블을 컨바인할까요? ${formatClock(at as number)} 교대부터 비우고 남은 시간표를 다시 짭니다.`
      : `T${label} 테이블을 다시 열까요? 남은 시간표를 다시 짭니다.`;
    if (!window.confirm(message)) return;
    if (!(await send({ type: "setTable", label, closedAt: at }))) return;
    if (!plan) return;
    const nextClosed = closedFrom.map((value, i) => (i === t ? at : value));
    const keep = plan.slots.filter((_, index) => index <= current);
    const built = buildPlan({
      dealers: planDealers(state.dealers, start),
      tables: state.tableCount,
      start,
      end: Math.max(now, start) + PLAN_HORIZON,
      interval: plan.interval,
      setup: plan.setup,
      keep,
      closedFrom: nextClosed,
    });
    await send({ type: "savePlan", plan: built });
  }

  /** 시간 바꾸기: 그 칸을 새 시간으로, 뒤 칸은 간격대로 */
  function saveTime() {
    if (!plan || !timeEdit) return;
    const minutes = parseClock(timeEdit.value);
    if (minutes == null) return;
    const prev = timeEdit.index > 0 ? plan.slots[timeEdit.index - 1].at : -Infinity;
    // 밤샘: 앞 칸보다 이르면 다음 날로
    let at = alignToStart(minutes, start);
    while (at <= prev) at += 1440;
    void send({ type: "savePlan", plan: retimeFrom(plan, timeEdit.index, at) });
    setTimeEdit(null);
  }

  /** 간격 바꾸기: 설정을 바꾸고, 지금 이후 칸 시간을 새 간격으로 맞춥니다. */
  async function changeInterval(interval: number) {
    if (!(await send({ type: "setSettings", interval }))) return;
    if (!plan) return;
    const from = Math.max(0, current + 1);
    if (from >= plan.slots.length) return;
    const base = from > 0 ? plan.slots[from - 1].at + interval : plan.slots[0].at;
    await send({ type: "savePlan", plan: retimeFrom(plan, from, base, interval) });
  }

  function changeCell(dealerId: string | null) {
    if (!plan || !cell) return;
    const slots = plan.slots.map((slot, index) => (index === cell.slot ? swapInSlot(slot, cell.table, dealerId) : slot));
    void send({ type: "savePlan", plan: { ...plan, slots } satisfies RotationPlan });
    setCell(null);
  }

  const swap = useMemo(() => (plan ? swapInfo(plan, labels, current, next, closedFrom) : null), [plan, labels, current, next, closedFrom]);

  // 보여 줄 칸: 바로 앞 칸 1개, 지금 칸(2번째), 그 뒤 칸들
  const rows = useMemo(() => {
    if (!plan) return [];
    const all = plan.slots.map((slot, index) => ({ slot, index }));
    if (showAll) return all;
    const from = Math.max(0, current - 1);
    return all.slice(from, from + VISIBLE_COLS);
  }, [plan, current, showAll]);
  const rowIndexes = rows.map((r) => r.index);

  const parsedLabels = parseTableLabels(labelsText);

  // 칸 바꾸기 후보: 그 시간에 일할 수 있는 모든 딜러(휴무·그 시각 전 퇴근 제외)
  const candidates = (() => {
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
  })();

  return (
    <div className="grid gap-3 pb-10 text-white">
      {/* 게임: 근무일 · 이름 · 바꾸기 */}
      <section aria-label="게임" className="flex flex-wrap items-center gap-2 rounded-2xl border-2 border-sky-500/60 bg-sky-950/40 p-3">
        <div className="grid min-w-0">
          <span className="text-xs font-bold text-sky-300">근무일 · 게임</span>
          <span className="truncate text-2xl font-black">
            {formatWorkDate(state.game.workDate)} <span className="text-amber-300">{state.game.name}</span>
          </span>
        </div>
        <select
          aria-label="게임 고르기"
          value={state.game.id}
          disabled={busy}
          onChange={(e) => void switchGame(e.target.value)}
          className="h-11 max-w-full min-w-0 rounded-lg border border-white/25 bg-black px-2 text-sm font-bold"
        >
          {state.games.map((g) => (
            <option key={g.id} value={g.id}>
              {formatWorkDate(g.workDate)} · {g.name}
            </option>
          ))}
        </select>
        <div className="ml-auto flex flex-wrap gap-1.5">
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              const today = kstDate();
              const base = state.game.workDate && state.game.workDate >= today ? nextDate(state.game.workDate) : today;
              setGameDialog({ mode: "day", name: state.game.name, workDate: base, copyDealers: false, copySettings: true });
            }}
            className="min-h-11 rounded-lg bg-sky-500 px-4 text-sm font-black text-black"
          >
            날짜 변경
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => setGameDialog({ mode: "new", name: "", workDate: state.game.workDate ?? kstDate(), copyDealers: false, copySettings: true })}
            className="min-h-11 rounded-lg bg-amber-400 px-4 text-sm font-black text-black"
          >
            + 새 게임
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => setGameDialog({ mode: "edit", name: state.game.name, workDate: state.game.workDate ?? kstDate(), copyDealers: false, copySettings: false })}
            className="min-h-11 rounded-lg border border-white/30 px-3 text-sm font-bold"
          >
            ✎ 이름·날짜
          </button>
        </div>
      </section>

      {/* 운영 현황 */}
      <section aria-label="운영 현황" className="grid gap-2 rounded-2xl border border-white/15 bg-black p-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className={cn("inline-flex items-center gap-1.5 text-xs font-bold", online ? "text-emerald-400" : "text-rose-400")}>
            <span className={cn("size-2.5 rounded-full", online ? "animate-pulse bg-emerald-400" : "bg-rose-500")} />
            {online ? "실시간 연결됨" : "연결 끊김"}
          </span>
          <span className="text-sm font-black text-amber-300">지금 {kstClock(clock)}</span>
        </div>
        <dl className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
          {[
            ["러닝 테이블", `${runningLabels.length}개`, "text-emerald-300"],
            ["총 딜러(출근 전 포함)", `${onDuty}명`, "text-white"],
            ["딜 중", `${dealing}명`, "text-emerald-300"],
            ["휴게 중", `${resting}명`, "text-amber-300"],
          ].map(([label, value, tone]) => (
            <div key={label} className="rounded-lg bg-zinc-900 px-2.5 py-1.5">
              <dt className="text-[11px] font-bold text-zinc-400">{label}</dt>
              <dd className={cn("text-2xl font-black", tone)}>{value}</dd>
            </div>
          ))}
        </dl>
        <p className="flex flex-wrap items-center gap-1 text-sm font-bold">
          <span className="text-zinc-400">러닝 중</span>
          {runningLabels.map((label) => (
            <span key={label} className="rounded-md bg-emerald-600 px-1.5 py-0.5 text-xs font-black text-white">
              T{label}
            </span>
          ))}
          {labels.length !== runningLabels.length ? (
            <>
              <span className="ml-2 text-rose-300">컨바인</span>
              {labels
                .filter((label) => !runningLabels.includes(label))
                .map((label) => (
                  <span key={label} className="rounded-md bg-rose-600 px-1.5 py-0.5 text-xs font-black text-white">
                    T{label}
                  </span>
                ))}
            </>
          ) : null}
        </p>
      </section>

      {/* 설정(처음 한 번만 정하면 되므로 접어 둠) */}
      <details className="group rounded-2xl border border-white/15 bg-black p-2" open={!plan}>
        <FoldHead>
          설정 · 게임 시작 {state.planStart} · {state.interval}분 간격 · 세팅 {state.setupMinutes ? `${state.setupMinutes}분` : "없음"} · 테이블 {formatTableLabels(labels)}
          {button ? ` · 버튼 ${button}번` : ""}
        </FoldHead>
        <div className="mt-2 grid gap-2">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
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
            로테이션 간격
            <select
              value={state.interval}
              disabled={busy}
              onChange={(e) => void changeInterval(Number(e.target.value))}
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
          <label className="grid gap-1 text-xs font-bold text-zinc-300">
            버튼 자리(모든 테이블 같음)
            <select
              value={button ?? 0}
              disabled={busy}
              onChange={(e) => void send({ type: "setTable", label: 0, button: Number(e.target.value) || null })}
              className="h-11 rounded-lg border border-white/20 bg-zinc-900 px-2 text-base font-bold"
            >
              <option value={0}>정하지 않음</option>
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  {n}번
                </option>
              ))}
            </select>
          </label>
          <label className="col-span-2 grid gap-1 text-xs font-bold text-zinc-300 sm:col-span-3">
            테이블 번호 ({state.tableCount}개 · 최대 {MAX_TABLES}개) · 예: 5-12, 15
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
              if (window.confirm("이 게임의 출근 기록과 시간표를 지울까요? 딜러 명단은 그대로 남습니다. (다른 날짜는 위 '날짜 변경'으로 새로 만드세요)")) {
                void send({ type: "newDay" });
              }
            }}
            className="ml-auto min-h-11 rounded-lg border border-white/25 px-3 text-sm font-bold hover:bg-white/10"
          >
            출근 기록 초기화
          </button>
        </div>
        </div>
      </details>

      {error ? <p className="rounded-lg bg-rose-950 px-3 py-2 text-sm font-bold text-rose-200">{error}</p> : null}

      {/* 다시 짜기 안내 */}
      {missing.length || leftInPlan.length ? (
        <section aria-label="다시 짜기 안내" className="flex flex-wrap items-center gap-2 rounded-xl border-2 border-rose-500 bg-rose-950/50 p-3 text-sm font-bold">
          <span className="text-rose-200">
            {missing.length ? `출근한 ${missing.map((d) => d.name).join(", ")} 딜러가 남은 시간표에 빠져 있습니다. ` : ""}
            {leftInPlan.length ? `퇴근·휴무인 ${leftInPlan.map((d) => d.name).join(", ")} 딜러가 남은 시간표에 있습니다. ` : ""}
          </span>
          <button type="button" disabled={busy} onClick={runAuto} className="ml-auto min-h-10 rounded-lg bg-amber-400 px-4 text-sm font-black text-black">
            Auto
          </button>
        </section>
      ) : null}

      {/* 다음 교대 */}
      {plan && swap ? (
        <section aria-label="다음 교대" className="grid gap-2 rounded-2xl border-2 border-amber-400 bg-amber-950/30 p-3">
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="text-2xl font-black text-amber-300">다음 교대 {formatClock(swap.at)}</span>
            <span className="text-sm font-bold text-amber-100">{untilLabel(swap.at - now)}</span>
            <div className="ml-auto flex flex-wrap gap-1.5">
              <button type="button" onClick={() => void downloadSwapImage(swap, name, button)} className="min-h-9 rounded-lg bg-white px-3 text-xs font-black text-black">
                교대표 이미지
              </button>
              <button
                type="button"
                onClick={() => void downloadDealerSwapImage(swap, plan, current, next, labels, state.dealers)}
                className="min-h-9 rounded-lg bg-white px-3 text-xs font-black text-black"
              >
                딜러별 이미지
              </button>
              <button
                type="button"
                onClick={async () => {
                  await navigator.clipboard.writeText(swapText(swap, name, button)).catch(() => undefined);
                  setCopied(true);
                  window.setTimeout(() => setCopied(false), 1500);
                }}
                className="min-h-9 rounded-lg bg-[#FEE500] px-3 text-xs font-black text-black"
              >
                {copied ? "복사됨 ✓" : "단톡방 텍스트"}
              </button>
            </div>
          </div>
          <ul className="grid max-h-[45dvh] grid-cols-[repeat(auto-fill,minmax(min(100%,14rem),1fr))] gap-1.5 overflow-y-auto pr-1">
            {swap.rows.map((row) => (
              <li key={row.label} data-swap={row.label} className={cn("flex items-center gap-2 rounded-lg px-2.5 py-1.5", row.closed ? "border border-rose-500 bg-rose-950" : "bg-black")}>
                <span className="text-lg font-black text-emerald-300">T{row.label}</span>
                {row.closed ? (
                  <span className="text-base font-black">
                    {row.from ? <span className="text-zinc-400">{name(row.from)} <span className="text-amber-300">→</span> </span> : null}
                    <span className="text-rose-300">컨바인</span>
                  </span>
                ) : row.from && row.from === row.to ? (
                  <span className="text-base font-black text-white">
                    {name(row.to)} <span className="text-xs text-zinc-400">유지</span>
                  </span>
                ) : (
                  <span className="text-base font-black">
                    <span className="text-zinc-400">{name(row.from) || "—"}</span> <span className="text-amber-300">→</span>{" "}
                    <span className={row.to ? "text-white" : "text-rose-300"}>{name(row.to) || "비어 있음"}</span>
                  </span>
                )}
              </li>
            ))}
          </ul>
          {swap.toRest.length || swap.stillRest.length ? (
            <p className="text-sm font-bold">
              {swap.toRest.length ? <span className="mr-3 text-amber-300">휴식 들어감 {swap.toRest.map(name).join(", ")}</span> : null}
              {swap.stillRest.length ? <span className="text-zinc-400">계속 휴식 {swap.stillRest.map(name).join(", ")}</span> : null}
            </p>
          ) : null}
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
            </>
          ) : null}
          {/* Auto: 시간표 바로 옆(오른쪽) */}
          <button
            type="button"
            disabled={busy || state.dealers.length === 0}
            onClick={runAuto}
            title="지금 칸 빈자리(퇴근·컨바인)를 채우고, 다음 칸부터 딜·휴식 시간을 맞춰 자동으로 다시 짭니다"
            className="ml-auto min-h-12 rounded-xl bg-amber-400 px-8 text-xl font-black text-black shadow-[0_0_0_3px_rgba(251,191,36,0.25)] disabled:opacity-40"
          >
            Auto
          </button>
        </div>

        {!plan ? (
          <p className="rounded-xl border border-dashed border-white/25 p-4 text-sm text-zinc-300">
            {state.plan ? "테이블 수가 바뀌어 시간표를 다시 짜야 합니다. " : ""}
            딜러를 등록하고 게임 시작, 간격, 테이블 번호를 정한 뒤 <b className="text-amber-300">로테이션 짜기</b>를 누르세요.
          </p>
        ) : view === "table" ? (
          <div className="max-h-[78dvh] overflow-auto rounded-xl border border-white/15">
            {/* 시간은 맨 위 한 줄, 테이블 번호는 왼쪽 */}
            <table className="border-collapse">
              <thead className="sticky top-0 z-20">
                <tr>
                  <th className="sticky left-0 z-30 bg-zinc-900 px-2 py-2 text-left text-sm font-black text-zinc-300">테이블 / 시간</th>
                  {rows.map(({ slot, index }) => {
                    const time = formatClock(slot.at);
                    return (
                      <th
                        key={slot.at}
                        data-slot={time}
                        className={cn("px-1 py-1.5", index === current ? "bg-emerald-700" : index === next ? "bg-amber-500" : "bg-zinc-900")}
                      >
                        <button
                          type="button"
                          onClick={() => setTimeEdit({ index, value: time })}
                          title="시간 바꾸기"
                          className={cn(
                            "grid w-full min-w-[5.5rem] rounded-md px-1 py-0.5 text-center hover:bg-white/10",
                            index === next ? "text-black" : "text-white",
                            index < current && "opacity-60",
                          )}
                        >
                          <span className="text-xl font-black">{time}</span>
                          <span className="text-[11px] font-bold">
                            {slotLabel(index) ?? (index === current ? "지금" : index === next ? "다음 교대" : "")} ✎
                          </span>
                        </button>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {labels.map((label, t) => hiddenTable(t) ? null : (
                  <tr key={label} className="border-t-2 border-white/10">
                    <th className="sticky left-0 z-10 bg-zinc-900 px-1.5 py-1 text-left whitespace-nowrap">
                      <span className="flex items-center gap-1">
                        <span className={cn("text-lg font-black", closedFrom[t] != null ? "text-rose-400" : "text-emerald-300")}>T{label}</span>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void toggleCombine(t)}
                          className={cn("min-h-7 rounded px-1 text-[10px] font-black", closedFrom[t] != null ? "bg-emerald-700 text-white" : "border border-rose-500/60 text-rose-300")}
                        >
                          {closedFrom[t] != null ? "다시 열기" : "컨바인"}
                        </button>
                      </span>
                      {closedFrom[t] != null ? <span className="block text-[10px] font-black text-rose-300">{formatClock(closedFrom[t] as number)} 컨바인</span> : null}
                    </th>
                    {rows.map(({ slot, index }) => {
                      const id = slot.seats[t];
                      const time = formatClock(slot.at);
                      if (isClosedAt(t, slot.at)) {
                        return (
                          <td key={slot.at} className={cn("px-1 py-1", index < current && "opacity-50")}>
                            <span data-closed className="grid min-h-12 min-w-[5.5rem] place-items-center rounded-lg border-2 border-rose-500 bg-rose-950 text-xs font-black text-rose-300">
                              T{label} 컨바인
                            </span>
                          </td>
                        );
                      }
                      const goneHere = isGone(id, index);
                      return (
                        <td
                          key={slot.at}
                          className={cn("px-1 py-1", index === current ? "bg-emerald-950" : index === next ? "bg-[#2a1d05]" : "bg-black", index < current && "opacity-50")}
                        >
                          <button
                            type="button"
                            data-cell={`${time}-T${label}`}
                            onClick={() => setCell({ slot: index, table: t })}
                            className={cn(
                              "grid w-full min-w-[5.5rem] gap-0.5 rounded-lg px-1.5 py-1.5 text-center",
                              goneHere ? "bg-rose-700 hover:bg-rose-600" : id ? "bg-zinc-800 hover:bg-zinc-700" : "border-2 border-dashed border-rose-500/70",
                              cell?.slot === index && cell.table === t && "ring-2 ring-amber-300",
                            )}
                          >
                            <span className={cn("text-[10px] font-black", goneHere ? "text-white" : "text-emerald-300")}>
                              T{label} · {time}
                              {goneHere ? ` · ${goneLabel(id as string)}` : ""}
                            </span>
                            <span className={cn("truncate text-base font-black", id ? "text-white" : "text-rose-300")}>{id ? name(id) : "비어 있음"}</span>
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
                <tr className="border-t-2 border-amber-400/40">
                  <th className="sticky left-0 z-10 bg-zinc-900 px-3 py-1.5 text-left text-base font-black text-amber-300">휴식</th>
                  {rows.map(({ slot, index }) => (
                    <td key={slot.at} className={cn("max-w-[7rem] px-1.5 py-1.5 align-top text-xs font-bold text-amber-200", index < current && "opacity-50")}>
                      {slot.rest.length
                        ? slot.rest.map((id, i) => (
                            <span key={id} className={cn(isGone(id, index) && "rounded bg-rose-700 px-1 text-white")}>
                              {i ? ", " : ""}
                              {name(id)}
                            </span>
                          ))
                        : "—"}
                    </td>
                  ))}
                </tr>
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
        {plan && hiddenLabels.length ? (
          <p className="flex flex-wrap items-center gap-1.5 text-sm font-bold">
            <span className="text-rose-300">컨바인된 테이블(시간표에서 숨김)</span>
            {hiddenLabels.map((label) => (
              <button
                key={label}
                type="button"
                disabled={busy}
                onClick={() => void toggleCombine(labels.indexOf(label))}
                title="다시 열기"
                className="min-h-8 rounded-md bg-rose-600 px-2 text-xs font-black text-white hover:bg-rose-500"
              >
                T{label} · 다시 열기
              </button>
            ))}
          </p>
        ) : null}
      </section>

      {/* 딜러 · 출근 체크(작게) */}
      <section aria-label="딜러" className="grid gap-2">
        <div className="flex flex-wrap items-baseline gap-2">
          <h2 className="text-lg font-black text-zinc-100">
            딜러 · 출근 체크{" "}
            <span className="text-sm text-zinc-400">
              ({state.dealers.length}/{MAX_DEALERS}명)
            </span>
          </h2>
        </div>
        <p className="text-xs text-zinc-400">
          <b className="text-zinc-200">이름 ✎</b>을 누르면 이름 수정·삭제, <b className="text-zinc-200">출근/퇴근 시간</b>을 누르면 시간을 바꿀 수 있습니다.
        </p>
        {state.dealers.length === 0 ? (
          <p className="rounded-xl border border-dashed border-white/25 p-3 text-sm text-zinc-400">아래에서 딜러를 등록하세요.</p>
        ) : (
          <div className="grid gap-2">
            {(
              [
                { key: "in", title: "출근 중", tone: "text-emerald-300", list: state.dealers.filter((d) => d.status === "IN") },
                { key: "wait", title: "출근 전", tone: "text-zinc-200", list: state.dealers.filter((d) => d.status === "WAIT" || d.status === "OFF") },
                { key: "left", title: "퇴근", tone: "text-slate-300", list: state.dealers.filter((d) => d.status === "LEFT") },
              ] as const
            ).map((group) =>
              group.list.length ? (
                <div key={group.key} data-group={group.key} className="grid gap-1">
                  <h3 className={cn("text-sm font-black", group.tone)}>
                    {group.title} {group.list.length}명
                  </h3>
                  <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,19.5rem),1fr))] gap-1">
                    {[...group.list]
                      .sort((a, b) => a.sort - b.sort)
                      .map((dealer) => (
                        <div
                          key={dealer.id}
                          data-dealer={dealer.name}
                          className={cn(
                            "flex items-center gap-1.5 rounded-lg border px-2 py-1.5",
                            dealer.status === "IN" ? "border-emerald-500/40 bg-emerald-950/30" : "border-white/10 bg-zinc-950",
                            dealer.status === "LEFT" && "opacity-60",
                          )}
                        >
                          <button
                            type="button"
                            onClick={() => setEditing({ id: dealer.id, name: dealer.name, startTime: dealer.startTime ?? "" })}
                            title="이름 수정·삭제"
                            className="flex min-w-0 flex-1 items-center gap-1 text-left text-base font-black hover:underline"
                          >
                            <span className="truncate">{dealer.name}</span>
                            <span className="shrink-0 text-xs text-zinc-400">✎</span>
                          </button>
                          {/* 출근·퇴근 시간(누르면 바꾸기). 실제 체크한 시간은 색으로, 예정 시간은 회색 */}
                          <button
                            type="button"
                            data-times={dealer.name}
                            onClick={() =>
                              setTimes({
                                id: dealer.id,
                                name: dealer.name,
                                start: dealer.checkedInAt ? kstClock(dealer.checkedInAt) : (dealer.startTime ?? ""),
                                end: dealer.status === "LEFT" && dealer.leftAt ? kstClock(dealer.leftAt) : (dealer.endTime ?? ""),
                                startReal: Boolean(dealer.checkedInAt),
                                endReal: dealer.status === "LEFT" && Boolean(dealer.leftAt),
                              })
                            }
                            title="출근·퇴근 시간 바꾸기"
                            className="grid shrink-0 rounded px-1 text-left text-[11px] leading-tight font-bold tabular-nums hover:bg-white/10"
                          >
                            <span className={dealer.checkedInAt ? "text-emerald-300" : "text-zinc-400"}>
                              출근 {dealer.checkedInAt ? kstClock(dealer.checkedInAt) : (dealer.startTime ?? "—")}
                            </span>
                            <span className={dealer.status === "LEFT" ? "text-rose-300" : dealer.endTime ? "text-sky-300" : "text-zinc-400"}>
                              퇴근 {dealer.status === "LEFT" && dealer.leftAt ? kstClock(dealer.leftAt) : (dealer.endTime ? `${dealer.endTime} 예정` : "—")}
                            </span>
                          </button>
                          {dealer.status === "IN" ? (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => {
                                if (window.confirm(`${dealer.name} 딜러를 퇴근 처리할까요? 그다음 Auto를 누르면 쉬던 딜러가 자리를 채웁니다.`)) {
                                  void send({ type: "setStatus", id: dealer.id, status: "LEFT" });
                                }
                              }}
                              className="min-h-9 rounded bg-slate-500 px-3 text-xs font-black text-white"
                            >
                              퇴근
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => void send({ type: "checkIn", id: dealer.id })}
                              className="min-h-9 rounded bg-emerald-500 px-3 text-xs font-black text-black"
                            >
                              {dealer.status === "LEFT" ? "다시 출근" : "출근"}
                            </button>
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              ) : null,
            )}
          </div>
        )}
        <details className="group rounded-xl border border-white/15 bg-zinc-950 p-2" open={state.dealers.length === 0}>
          <FoldHead>딜러 등록 (한 줄에 한 명 · 예: 김딜러 10:00 또는 김딜러 18:00-02:00 · 최대 {MAX_DEALERS}명)</FoldHead>
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

      {/* 시간 바꾸기 */}
      {plan && timeEdit ? (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-black/70 p-4" role="dialog" aria-label="시간 바꾸기">
          <div className="grid w-full max-w-sm gap-3 rounded-2xl border border-white/20 bg-zinc-950 p-4">
            <h3 className="text-lg font-black">교대 시간 바꾸기</h3>
            <p className="text-xs text-zinc-400">이 칸 시간을 바꾸면 뒤 칸은 로테이션 간격({plan.interval}분)대로 다시 맞춰집니다. 배정은 그대로입니다.</p>
            <input
              type="time"
              value={timeEdit.value}
              onChange={(e) => setTimeEdit({ ...timeEdit, value: e.target.value })}
              className="h-12 rounded-lg border border-white/20 bg-black px-2 text-xl font-black text-white"
            />
            <div className="flex gap-2">
              <button type="button" disabled={busy} onClick={saveTime} className="min-h-11 rounded-lg bg-amber-400 px-4 text-sm font-black text-black">
                저장
              </button>
              <button type="button" onClick={() => setTimeEdit(null)} className="ml-auto min-h-11 rounded-lg border border-white/30 px-4 text-sm font-bold">
                닫기
              </button>
            </div>
          </div>
        </div>
      ) : null}

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

      {/* 새 게임 · 날짜 변경 · 이름/날짜 고치기 */}
      {gameDialog ? (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-black/70 p-4" role="dialog" aria-label="게임">
          <div className="grid w-full max-w-sm gap-3 rounded-2xl border border-white/20 bg-zinc-950 p-4">
            <h3 className="text-lg font-black">
              {gameDialog.mode === "day" ? "날짜 변경(새 근무일)" : gameDialog.mode === "new" ? "새 게임" : "이름·날짜 고치기"}
            </h3>
            <p className="text-xs text-zinc-400">
              {gameDialog.mode === "edit"
                ? "지금 게임의 이름과 날짜만 바꿉니다."
                : "새 게임은 딜러·테이블·시간표가 따로입니다. 지금 게임은 그대로 남고, 위 목록에서 언제든 다시 볼 수 있습니다."}
            </p>
            <label className="grid gap-1 text-sm font-bold">
              날짜
              <input
                type="date"
                value={gameDialog.workDate}
                onChange={(e) => setGameDialog({ ...gameDialog, workDate: e.target.value })}
                className="h-11 rounded-lg border border-white/20 bg-black px-2 text-base"
              />
            </label>
            <label className="grid gap-1 text-sm font-bold">
              게임 이름
              <input
                value={gameDialog.name}
                placeholder="예: 메인 게임, 사이드 이벤트"
                maxLength={30}
                onChange={(e) => setGameDialog({ ...gameDialog, name: e.target.value })}
                className="h-11 rounded-lg border border-white/20 bg-black px-2 text-base"
              />
            </label>
            {gameDialog.mode !== "edit" ? (
              <>
                <label className="flex items-center gap-2 text-sm font-bold">
                  <input
                    type="checkbox"
                    checked={gameDialog.copyDealers}
                    onChange={(e) => setGameDialog({ ...gameDialog, copyDealers: e.target.checked })}
                    className="size-5"
                  />
                  지금 딜러 명단 가져오기 <span className="text-xs text-zinc-400">(출근 기록은 비움)</span>
                </label>
                <label className="flex items-center gap-2 text-sm font-bold">
                  <input
                    type="checkbox"
                    checked={gameDialog.copySettings}
                    onChange={(e) => setGameDialog({ ...gameDialog, copySettings: e.target.checked })}
                    className="size-5"
                  />
                  설정 가져오기 <span className="text-xs text-zinc-400">(테이블 번호·간격·시작 시간)</span>
                </label>
              </>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy || !gameDialog.workDate}
                onClick={() => void saveGame()}
                className="min-h-11 rounded-lg bg-emerald-500 px-4 text-sm font-black text-black disabled:opacity-40"
              >
                {gameDialog.mode === "edit" ? "저장" : "만들기"}
              </button>
              {gameDialog.mode === "edit" && state.games.length > 1 ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={async () => {
                    if (!window.confirm(`'${state.game.name}' 게임을 지울까요? 이 게임의 딜러와 시간표가 모두 지워집니다.`)) return;
                    if (await send({ type: "deleteGame" })) setGameDialog(null);
                  }}
                  className="min-h-11 rounded-lg bg-rose-600 px-4 text-sm font-black text-white"
                >
                  게임 삭제
                </button>
              ) : null}
              <button type="button" onClick={() => setGameDialog(null)} className="ml-auto min-h-11 rounded-lg border border-white/30 px-4 text-sm font-bold">
                닫기
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* 출근·퇴근 시간 바꾸기 */}
      {times ? (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-black/70 p-4" role="dialog" aria-label="출근·퇴근 시간">
          <div className="grid w-full max-w-sm gap-3 rounded-2xl border border-white/20 bg-zinc-950 p-4">
            <h3 className="text-lg font-black">{times.name} · 출근/퇴근 시간</h3>
            <label className="grid gap-1 text-sm font-bold">
              {times.startReal ? "출근 시간(출근 체크한 시간)" : "예정 출근 시간"}
              <input
                type="time"
                value={times.start}
                onChange={(e) => setTimes({ ...times, start: e.target.value })}
                className="h-11 rounded-lg border border-white/20 bg-black px-2 text-base"
              />
            </label>
            <label className="grid gap-1 text-sm font-bold">
              {times.endReal ? "퇴근 시간(퇴근 누른 시간)" : "예정 퇴근 시간(비우면 끝까지)"}
              <input
                type="time"
                value={times.end}
                onChange={(e) => setTimes({ ...times, end: e.target.value })}
                className="h-11 rounded-lg border border-white/20 bg-black px-2 text-base"
              />
            </label>
            <p className="text-xs text-zinc-400">저장한 뒤 시간표 옆 <b className="text-amber-300">Auto</b>를 누르면 바뀐 시간에 맞춰 다시 정리됩니다.</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={async () => {
                  if (await send({ type: "setTimes", id: times.id, start: times.start || null, end: times.end || null })) setTimes(null);
                }}
                className="min-h-11 rounded-lg bg-emerald-500 px-4 text-sm font-black text-black"
              >
                저장
              </button>
              <button type="button" onClick={() => setTimes(null)} className="ml-auto min-h-11 rounded-lg border border-white/30 px-4 text-sm font-bold">
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
