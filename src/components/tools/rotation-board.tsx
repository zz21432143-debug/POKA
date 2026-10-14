"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "cn";
import { ToolDialog } from "@/components/tools/tool-dialog";
import {
  INTERVAL_CHOICES,
  INTERVAL_MAX,
  INTERVAL_MIN,
  MAX_STREAK_CHOICES,
  MAX_DEALERS,
  MAX_GAMES,
  MAX_ROSTERS,
  TRASH_DAYS,
  MAX_TABLES,
  STATUS_LABEL,
  tableTag,
  tableWord,
  closedFromOf,
  openedFromOf,
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
  dealersNeeded,
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

type GameDialog = { mode: "new" | "day" | "edit"; name: string; workDate: string; copyDealers: boolean; copySettings: boolean; rosterId?: string };

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
  /** 딜러 명단 저장 · 고치기 창 */
  const [rosterEdit, setRosterEdit] = useState<{ id?: string; name: string; text: string } | null>(null);
  const [labelsText, setLabelsText] = useState(() => formatTableLabels(initial.tableLabels));
  const [editing, setEditing] = useState<{ id: string; name: string; startTime: string } | null>(null);
  const [times, setTimes] = useState<{ id: string; name: string; start: string; end: string; startReal: boolean; endReal: boolean } | null>(null);
  const [cell, setCell] = useState<{ slot: number; table: number } | null>(null);
  const [timeEdit, setTimeEdit] = useState<{ index: number; value: string } | null>(null);
  const [view, setView] = useState<"table" | "dealer">("table");
  const [showAll, setShowAll] = useState(false);
  const [copied, setCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  // 공유 링크 앞부분(사이트 주소). 화면이 뜬 뒤에 읽습니다.
  const [origin, setOrigin] = useState("");
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 주소는 브라우저에서만 알 수 있습니다.
    setOrigin(window.location.origin);
  }, []);
  const [gameDialog, setGameDialog] = useState<GameDialog | null>(null);
  /** 지난 게임 정리 창: 고른 게임 id(null이면 닫힘) */
  const [cleanup, setCleanup] = useState<string[] | null>(null);
  // 화면 탭: 운영(시간표) · 딜러 · 공유 · 설정. 딜러가 없으면 딜러 탭부터
  const [tab, setTab] = useState<"run" | "dealers" | "share" | "settings">(() => (initial.dealers.length ? "run" : "dealers"));
  // 딜러 등록 칸: 등록한 뒤에도 접히지 않게(여러 번 나눠 등록)
  const [regOpen, setRegOpen] = useState(initial.dealers.length === 0);
  // 공유 링크 QR코드(이미지 주소)
  const [qr, setQr] = useState<string | null>(null);
  // 게임 중 테이블 추가 오픈
  const [addText, setAddText] = useState("");
  /** 간격 직접 입력(목록에 없는 값이면 처음부터 입력칸) */
  const [customInterval, setCustomInterval] = useState(() => !(INTERVAL_CHOICES as readonly number[]).includes(initial.interval));
  const [intervalText, setIntervalText] = useState(() => String(initial.interval));
  const [openNotice, setOpenNotice] = useState<string | null>(null);
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
    setCustomInterval(!(INTERVAL_CHOICES as readonly number[]).includes(next.interval));
    setIntervalText(String(next.interval));
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
            copyDealers: gameDialog.mode === "day" && gameDialog.copyDealers,
            copySettings: gameDialog.copySettings,
          });
    // 저장한 명단을 골랐으면 새 게임에 바로 등록(send가 새 게임으로 바뀐 뒤라 그 게임에 들어감)
    const roster = gameDialog.mode !== "edit" && gameDialog.rosterId ? state.rosters.find((r) => r.id === gameDialog.rosterId) : null;
    if (ok && roster) {
      const dealers = parseDealerLines(roster.text);
      if (dealers.length) await send({ type: "addDealers", dealers });
    }
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
  // 게임 중 추가로 연 테이블: 연 시각 앞 칸은 "오픈 전"
  const openedFrom = useMemo(() => openedFromOf(labels, state.tableState), [labels, state.tableState]);
  const isBeforeOpen = (t: number, at: number) => openedFrom[t] != null && at < (openedFrom[t] as number);
  // 운영 현황(지금 칸 기준, 시작 전이면 첫 칸)
  const nowSlot = plan ? plan.slots[Math.max(0, current)] : null;
  // 이미 컨바인된(지금 칸부터 닫힌) 테이블은 시간표 줄에서 빼서 자리를 아낍니다. 다음 교대에 닫히는 테이블은 빨간색으로 남겨 둡니다.
  const hiddenTable = (t: number) => closedFrom[t] != null && (closedFrom[t] as number) <= (nowSlot?.at ?? now);
  const hiddenLabels = labels.filter((_, t) => hiddenTable(t));
  const runningLabels = labels.filter((_, t) => !isClosedAt(t, nowSlot?.at ?? now));
  const dealing = nowSlot ? nowSlot.seats.filter(Boolean).length : 0;
  const resting = nowSlot ? nowSlot.rest.length : 0;
  const onDuty = state.dealers.filter((d) => d.status !== "OFF" && d.status !== "LEFT").length;
  // 최대 연속 딜: 분 → 칸 수(간격으로 나눔). 0이면 제한 없음
  const intervalNow = plan?.interval ?? state.interval;
  const maxStreak = state.maxStreakMinutes > 0 ? Math.max(1, Math.floor(state.maxStreakMinutes / intervalNow)) : 0;
  const needed = dealersNeeded(runningLabels.length, maxStreak);
  const shortBy = Math.max(0, needed - onDuty);
  // 테이블이 많을 때 간격이 너무 짧으면 시간표가 커져 다른 기기 반영이 느려집니다.
  const intervalTooShort = labels.length > 40 && state.interval < 15;
  const shareUrl = state.shareToken && origin ? `${origin}/r/${state.shareToken}` : null;
  useEffect(() => {
    if (!shareUrl) return;
    let alive = true;
    void import("qrcode")
      .then((QR) => QR.toDataURL(shareUrl, { width: 480, margin: 1, color: { dark: "#000000", light: "#ffffff" } }))
      .then((url) => {
        if (alive) setQr(url);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [shareUrl]);

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

  /**
   * 게임 중 테이블 추가 오픈(예: 9~21 운영 중 7, 8 추가). 시간표는 그대로 두고 새 테이블만 빈칸으로 넣습니다.
   * 지금 칸부터 열리고, Auto를 누르면 쉬던 딜러가 들어갑니다.
   */
  async function openTables() {
    const { labels: wanted, errors } = parseTableLabels(addText);
    const added = wanted.filter((label) => !labels.includes(label));
    if (errors.length || !added.length) {
      setError(
        errors.length
          ? `테이블 번호를 확인하세요: ${errors.join(", ")}`
          : "이미 있는 테이블입니다. 컨바인했던 테이블은 시간표 아래 \"다시 열기\"로 여세요.",
      );
      return;
    }
    if (labels.length + added.length > MAX_TABLES) {
      setError(`테이블은 최대 ${MAX_TABLES}개입니다.`);
      return;
    }
    // 다시 연 테이블(컨바인했던 번호)은 "다시 열기"로
    const next = [...labels, ...added].sort((a, b) => a - b);
    const openedAt = plan ? (plan.slots[Math.max(0, current)]?.at ?? undefined) : undefined;
    if (await send({ type: "setSettings", tableLabels: formatTableLabels(next), openedAt })) {
      setAddText("");
      setOpenNotice(`${added.map((l) => tableTag(l)).join(", ")} 오픈했습니다. Auto를 누르면 쉬던 딜러가 들어갑니다.`);
    }
  }

  /** Auto: 지금 칸 빈자리(퇴근·컨바인) 채우고, 다음 칸부터 딜·휴식 시간 맞춰 다시 짬 */
  function runAuto() {
    // 새 게임은 테이블 0개 · 딜러 0명으로 시작하므로 먼저 정하라고 안내
    if (state.tableCount === 0) {
      setError("테이블이 0개예요. 설정 탭에서 테이블 번호(예: 1-8)를 먼저 정해 주세요.");
      return;
    }
    if (state.dealers.length === 0) {
      setError("딜러가 없어요. 딜러 탭에서 딜러를 먼저 등록해 주세요.");
      return;
    }
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
      maxStreak,
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
      ? `${tableWord(label)}을 컨바인할까요? ${formatClock(at as number)} 교대부터 비우고 남은 시간표를 다시 짭니다.`
      : `${tableWord(label)}을 다시 열까요? 남은 시간표를 다시 짭니다.`;
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
      maxStreak,
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
        <div className="grid min-w-0 gap-1">
          <span className="text-xs font-bold text-sky-300">근무일 · 게임 이름(교대표·TV에 나옵니다)</span>
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-2xl font-black">{formatWorkDate(state.game.workDate)}</span>
            <input
              key={`${state.game.id}-${state.game.name}`}
              aria-label="게임 이름"
              defaultValue={state.game.name}
              maxLength={30}
              placeholder="예: POKA DAY-1"
              disabled={busy}
              onBlur={(e) => {
                const value = e.target.value.trim();
                if (value && value !== state.game.name) void send({ type: "setGame", name: value });
                else e.target.value = state.game.name;
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.currentTarget.blur();
              }}
              className="h-11 w-48 max-w-full rounded-lg border-2 border-amber-400/70 bg-black px-2 text-xl font-black text-amber-300"
            />
            <span className="text-xs text-zinc-400">✎ 눌러서 바로 바꾸기</span>
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
            onClick={() => setGameDialog({ mode: "new", name: "", workDate: state.game.workDate ?? kstDate(), copyDealers: false, copySettings: false })}
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
            ✎ 날짜·삭제
          </button>
        </div>
      </section>

      {/* 처음 쓰는 사람용 3단계 안내: 다 끝나면(시간표가 생기면) 사라집니다 */}
      {!plan || state.dealers.length === 0 ? (
        <section data-rotation-guide aria-label="시작 안내" className="grid gap-2 rounded-2xl border border-amber-400/50 bg-amber-950/40 p-3">
          <h2 className="text-sm font-black text-amber-200">처음이면 이 순서대로 해 주세요</h2>
          <ol className="grid gap-1.5 sm:grid-cols-3">
            {(
              [
                { key: "dealers", no: "①", title: "딜러 등록", body: `딜러 탭 · 지금 ${state.dealers.length}명`, done: state.dealers.length > 0 },
                { key: "settings", no: "②", title: "테이블 정하기", body: `설정 탭 · 지금 ${state.tableCount}개`, done: state.tableCount > 0 },
                { key: "run", no: "③", title: "Auto 누르기", body: "시간표 자동 완성", done: !!plan },
              ] as const
            ).map((step, index, steps) => {
              // 앞 단계가 다 끝난 첫 단계를 강조
              const active = !step.done && steps.slice(0, index).every((s) => s.done);
              return (
                <li key={step.key}>
                  <button
                    type="button"
                    data-guide-step={step.key}
                    disabled={busy}
                    onClick={() => {
                      setTab(step.key);
                      // ③은 바로 Auto(앞 단계가 남았으면 runAuto가 무엇부터 할지 알려 줌)
                      if (step.key === "run") runAuto();
                    }}
                    className={cn(
                      "flex min-h-12 w-full items-center gap-2 rounded-xl border px-3 py-2 text-left transition active:scale-[0.98]",
                      step.done
                        ? "border-emerald-500/40 bg-emerald-950/40 text-emerald-200"
                        : active
                          ? "border-amber-400 bg-amber-400 text-black"
                          : "border-white/15 bg-black/40 text-zinc-300",
                    )}
                  >
                    <span className="text-lg font-black">{step.done ? "✔" : step.no}</span>
                    <span className="grid min-w-0 flex-1">
                      <span className="text-sm font-black">{step.title}</span>
                      <span className={cn("truncate text-xs", active ? "text-black/70" : "opacity-75")}>{step.body}</span>
                    </span>
                    <span aria-hidden className="text-base font-black">›</span>
                  </button>
                </li>
              );
            })}
          </ol>
        </section>
      ) : null}

      {/* 게임 수 한도에 가까우면 지난 게임 정리 안내 */}
      {state.games.length >= MAX_GAMES - 20 ? (
        <p data-cleanup-notice className="flex flex-wrap items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-950/50 px-3 py-2 text-sm font-bold text-amber-200">
          게임이 {state.games.length}/{MAX_GAMES}개예요. {state.games.length >= MAX_GAMES ? "더 만들려면" : "한도에 가까워요."} 지난 게임을 정리해 주세요.
          <button
            type="button"
            disabled={busy}
            onClick={() => setCleanup([])}
            className="ml-auto min-h-10 rounded-lg bg-amber-400 px-4 text-sm font-black text-black"
          >
            지난 게임 정리하기
          </button>
        </p>
      ) : null}

      {/* 탭: 운영(시간표) · 딜러 · 공유 · 설정 */}
      <nav aria-label="로테이션 메뉴" role="tablist" className="grid grid-cols-4 gap-1 rounded-2xl border border-white/15 bg-zinc-950 p-1">
        {(
          [
            ["run", "운영"],
            ["dealers", `딜러 ${state.dealers.length}`],
            ["share", state.shareToken ? "공유 ●" : "공유"],
            ["settings", "설정"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={cn("min-h-11 rounded-xl text-sm font-black", tab === key ? "bg-amber-400 text-black" : "text-zinc-300 hover:bg-white/10")}
          >
            {label}
          </button>
        ))}
      </nav>

      {error ? <p className="rounded-lg bg-rose-950 px-3 py-2 text-sm font-bold text-rose-200">{error}</p> : null}

      {tab === "run" ? (
      <>
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
              {tableTag(label)}
            </span>
          ))}
          {labels.length !== runningLabels.length ? (
            <>
              <span className="ml-2 text-rose-300">컨바인</span>
              {labels
                .filter((label) => !runningLabels.includes(label))
                .map((label) => (
                  <span key={label} className="rounded-md bg-rose-600 px-1.5 py-0.5 text-xs font-black text-white">
                    {tableTag(label)}
                  </span>
                ))}
            </>
          ) : null}
        </p>
        {/* 게임 중 테이블 추가 오픈 */}
        <div className="flex flex-wrap items-center gap-1.5">
          <input
            aria-label="추가로 열 테이블"
            value={addText}
            placeholder="추가로 열 테이블 (예: 7, 8 또는 E)"
            onChange={(e) => setAddText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && addText.trim()) void openTables();
            }}
            className="h-10 min-w-0 flex-1 rounded-lg border border-white/20 bg-zinc-900 px-2 text-base font-bold"
          />
          <button
            type="button"
            disabled={busy || !addText.trim()}
            onClick={() => void openTables()}
            className="min-h-10 rounded-lg bg-emerald-500 px-3 text-sm font-black text-black disabled:opacity-40"
          >
            + 테이블 추가 오픈
          </button>
        </div>
        {openNotice ? (
          <p data-open-notice className="flex flex-wrap items-center gap-2 rounded-lg bg-emerald-950 px-2 py-1.5 text-sm font-bold text-emerald-200">
            {openNotice}
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                runAuto();
                setOpenNotice(null);
              }}
              className="ml-auto min-h-9 rounded-lg bg-amber-400 px-4 text-sm font-black text-black"
            >
              Auto
            </button>
          </p>
        ) : null}
      </section>

      </>
      ) : null}

      {/* 설정 탭 */}
      {tab === "settings" ? (
      <section aria-label="설정" className="grid gap-2 rounded-2xl border border-white/15 bg-black p-3">
        <h2 className="text-base font-black">
          설정 · 게임 시작 {state.planStart} · {state.interval}분 간격 · 세팅 {state.setupMinutes ? `${state.setupMinutes}분` : "없음"} · 테이블 {formatTableLabels(labels)}
          {state.maxStreakMinutes ? ` · 연속 딜 최대 ${state.maxStreakMinutes}분` : ""}
          {button ? ` · 버튼 ${button}번` : ""}
        </h2>
        <div className="mt-2 grid gap-2">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <label className="grid min-w-0 gap-1 text-xs font-bold text-zinc-300">
            게임 시작
            <input
              type="time"
              defaultValue={state.planStart}
              key={`s-${state.planStart}`}
              onBlur={(e) => e.target.value && e.target.value !== state.planStart && void send({ type: "setSettings", planStart: e.target.value })}
              className="h-11 w-full min-w-0 rounded-lg border border-white/20 bg-zinc-900 px-2 text-base font-bold text-white"
            />
          </label>
          <label className="grid min-w-0 gap-1 text-xs font-bold text-zinc-300">
            로테이션 간격
            <span className="flex gap-1.5">
              <select
                aria-label="로테이션 간격 고르기"
                value={customInterval ? "custom" : state.interval}
                disabled={busy}
                onChange={(e) => {
                  if (e.target.value === "custom") {
                    setIntervalText(String(state.interval));
                    setCustomInterval(true);
                    return;
                  }
                  setCustomInterval(false);
                  void changeInterval(Number(e.target.value));
                }}
                className="h-11 w-full min-w-0 flex-1 rounded-lg border border-white/20 bg-zinc-900 px-2 text-base font-bold"
              >
                {INTERVAL_CHOICES.map((n) => (
                  <option key={n} value={n}>
                    {n}분
                  </option>
                ))}
                <option value="custom">직접 입력…</option>
              </select>
              {customInterval ? (
                <input
                  aria-label="로테이션 간격(분) 직접 입력"
                  type="number"
                  inputMode="numeric"
                  min={INTERVAL_MIN}
                  max={INTERVAL_MAX}
                  value={intervalText}
                  disabled={busy}
                  onChange={(e) => setIntervalText(e.target.value)}
                  onBlur={() => {
                    const n = Math.round(Number(intervalText));
                    if (!Number.isFinite(n) || n < INTERVAL_MIN || n > INTERVAL_MAX) {
                      setError(`로테이션 간격은 ${INTERVAL_MIN}~${INTERVAL_MAX}분 사이로 적어 주세요.`);
                      setIntervalText(String(state.interval));
                      return;
                    }
                    if (n !== state.interval) void changeInterval(n);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") e.currentTarget.blur();
                  }}
                  className="h-11 w-20 shrink-0 rounded-lg border-2 border-amber-400/70 bg-black px-2 text-base font-black text-amber-300"
                />
              ) : null}
            </span>
          </label>
          <label className="grid min-w-0 gap-1 text-xs font-bold text-zinc-300">
            시작 전 세팅 칸
            <select
              value={state.setupMinutes}
              disabled={busy}
              onChange={(e) => void send({ type: "setSettings", setupMinutes: Number(e.target.value) })}
              className="h-11 w-full min-w-0 rounded-lg border border-white/20 bg-zinc-900 px-2 text-base font-bold"
            >
              {SETUP_CHOICES.map((n) => (
                <option key={n} value={n}>
                  {n ? `${n}분 전부터` : "없음"}
                </option>
              ))}
            </select>
          </label>
          <label className="grid min-w-0 gap-1 text-xs font-bold text-zinc-300">
            버튼 자리(모든 테이블 같음)
            <select
              value={button ?? 0}
              disabled={busy}
              onChange={(e) => void send({ type: "setTable", label: 0, button: Number(e.target.value) || null })}
              className="h-11 w-full min-w-0 rounded-lg border border-white/20 bg-zinc-900 px-2 text-base font-bold"
            >
              <option value={0}>정하지 않음</option>
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  {n}번
                </option>
              ))}
            </select>
          </label>
          <label className="grid min-w-0 gap-1 text-xs font-bold text-zinc-300">
            최대 연속 딜(이만큼 딜하면 쉬기)
            <select
              value={state.maxStreakMinutes}
              disabled={busy}
              onChange={(e) => void send({ type: "setSettings", maxStreakMinutes: Number(e.target.value) })}
              className="h-11 w-full min-w-0 rounded-lg border border-white/20 bg-zinc-900 px-2 text-base font-bold"
            >
              {MAX_STREAK_CHOICES.map((n) => (
                <option key={n} value={n}>
                  {n ? `${n}분` : "제한 없음(공평하게)"}
                </option>
              ))}
            </select>
          </label>
          {intervalTooShort ? (
            <p className="col-span-2 rounded-lg bg-amber-950 px-2 py-1.5 text-xs font-bold text-amber-200 sm:col-span-3">
              테이블이 {labels.length}개로 많습니다. 로테이션 간격은 15~20분을 권장합니다(짧으면 시간표가 커져 다른 기기 반영이 느려질 수 있어요).
            </p>
          ) : null}
          <label className="col-span-2 grid gap-1 text-xs font-bold text-zinc-300 sm:col-span-3">
            테이블 번호 ({state.tableCount}개 · 최대 {MAX_TABLES}개) · 예: 5-12, 15 또는 A-D(알파벳은 A 테이블처럼 보여요)
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
                  const nextLabels = parsedLabels.labels;
                  const overlap = nextLabels.some((l) => labels.includes(l));
                  if (plan && !overlap && nextLabels.length !== labels.length && !window.confirm("겹치는 테이블 번호가 없어 시간표를 다시 짜야 합니다. 바꿀까요?")) return;
                  const openedAt = plan ? (plan.slots[Math.max(0, current)]?.at ?? undefined) : undefined;
                  void send({ type: "setSettings", tableLabels: labelsText, openedAt });
                }}
                className="min-h-11 rounded-lg border border-white/30 px-3 text-sm font-bold disabled:opacity-40"
              >
                적용
              </button>
            </span>
            {parsedLabels.errors.length ? <span className="text-rose-300">못 읽은 값: {parsedLabels.errors.join(", ")}</span> : null}
          </label>
        </div>
        <p className="rounded-lg bg-zinc-900 px-2 py-1.5 text-xs text-zinc-300">
          설정을 바꾼 뒤 <b className="text-amber-300">운영</b> 탭에서 <b className="text-amber-300">Auto</b>를 누르면 지금 이후 시간표가 다시 정리됩니다. 처음부터 새로 짜려면 시간표 삭제 → Auto.
        </p>
        </div>
      </section>
      ) : null}

      {tab === "run" ? (
      <>

      {/* 딜러 수 경고: 테이블보다 적거나, 최대 연속 딜을 지키기에 모자람 */}
      {labels.length && state.dealers.length && shortBy > 0 ? (
        <section aria-label="딜러 부족" className="flex flex-wrap items-center gap-2 rounded-xl border-2 border-amber-400 bg-amber-950/50 p-3 text-sm font-bold text-amber-100">
          <span className="text-lg">⚠</span>
          <span className="min-w-0 flex-1">
            {onDuty < runningLabels.length
              ? `러닝 테이블 ${runningLabels.length}개보다 딜러가 적습니다(${onDuty}명). 빈 테이블이 생깁니다.`
              : `최대 연속 딜 ${state.maxStreakMinutes}분을 지키려면 딜러가 ${shortBy}명 더 필요합니다(지금 ${onDuty}명 · 필요 ${needed}명).`}{" "}
            <span className="text-amber-300">{onDuty < runningLabels.length ? "테이블을 컨바인하거나 딜러를 더 넣어 주세요." : "그전까지는 일부 딜러가 더 길게 이어서 딜합니다."}</span>
          </span>
        </section>
      ) : null}

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
        <section aria-label="다음 교대" className="poka-watermark grid gap-2 rounded-2xl border-2 border-amber-400 bg-amber-950/30 p-3">
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="text-2xl font-black text-amber-300">다음 교대 {formatClock(swap.at)}</span>
            <span className="text-sm font-bold text-amber-100">{untilLabel(swap.at - now)}</span>
            <div className="ml-auto flex flex-wrap gap-1.5">
              <button type="button" onClick={() => void downloadSwapImage(swap, name, button, state.game.name)} className="min-h-9 rounded-lg bg-white px-3 text-xs font-black text-black">
                교대표 이미지
              </button>
              <button
                type="button"
                onClick={() => void downloadDealerSwapImage(swap, plan, current, next, labels, state.dealers, state.game.name)}
                className="min-h-9 rounded-lg bg-white px-3 text-xs font-black text-black"
              >
                딜러별 이미지
              </button>
              <button
                type="button"
                onClick={async () => {
                  await navigator.clipboard.writeText(swapText(swap, name, button, state.game.name)).catch(() => undefined);
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
                <span className="text-lg font-black text-emerald-300">{tableTag(row.label)}</span>
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
      <section aria-label="시간표" className="poka-watermark grid gap-2">
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
          {plan ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                if (window.confirm("시간표를 삭제할까요? 짜 둔 칸과 컨바인이 모두 지워집니다(딜러 명단·출근 기록은 그대로). 다시 짜려면 Auto를 누르세요.")) {
                  void send({ type: "clearPlan" });
                }
              }}
              className="ml-auto min-h-10 rounded-lg border border-rose-500/70 px-3 text-sm font-black text-rose-300 hover:bg-rose-950"
            >
              시간표 삭제
            </button>
          ) : null}
          {/* Auto: 시간표 바로 옆(오른쪽) */}
          <button
            type="button"
            disabled={busy || state.dealers.length === 0}
            onClick={runAuto}
            title="지금 칸 빈자리(퇴근·컨바인)를 채우고, 다음 칸부터 딜·휴식 시간을 맞춰 자동으로 다시 짭니다"
            className={cn("min-h-12 rounded-xl bg-amber-400 px-8 text-xl font-black text-black shadow-[0_0_0_3px_rgba(251,191,36,0.25)] disabled:opacity-40", !plan && "ml-auto")}
          >
            Auto
          </button>
        </div>

        {!plan ? (
          <p className="rounded-xl border border-dashed border-white/25 p-4 text-sm text-zinc-300">
            {state.plan ? "테이블 수가 바뀌어 시간표를 다시 짜야 합니다. " : ""}
            <b className="text-amber-300">딜러</b> 탭에서 딜러를 등록하고, <b className="text-amber-300">설정</b> 탭에서 게임 시작·테이블 번호를 정한 뒤 <b className="text-amber-300">Auto</b>를 누르세요.
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
                        <span className={cn("text-lg font-black", closedFrom[t] != null ? "text-rose-400" : "text-emerald-300")}>{tableTag(label)}</span>
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
                      {closedFrom[t] == null && openedFrom[t] != null ? (
                        <span className="block text-[10px] font-black text-emerald-300">{formatClock(openedFrom[t] as number)} 오픈</span>
                      ) : null}
                    </th>
                    {rows.map(({ slot, index }) => {
                      const id = slot.seats[t];
                      const time = formatClock(slot.at);
                      if (isBeforeOpen(t, slot.at)) {
                        return (
                          <td key={slot.at} className={cn("px-1 py-1", index < current && "opacity-50")}>
                            <span data-before-open className="grid min-h-12 min-w-[5.5rem] place-items-center rounded-lg border border-dashed border-white/15 bg-zinc-900 text-xs font-bold text-zinc-500">
                              오픈 전
                            </span>
                          </td>
                        );
                      }
                      if (isClosedAt(t, slot.at)) {
                        return (
                          <td key={slot.at} className={cn("px-1 py-1", index < current && "opacity-50")}>
                            <span data-closed className="grid min-h-12 min-w-[5.5rem] place-items-center rounded-lg border-2 border-rose-500 bg-rose-950 text-xs font-black text-rose-300">
                              {tableTag(label)} 컨바인
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
                            data-cell={`${time}-${tableTag(label)}`}
                            onClick={() => setCell({ slot: index, table: t })}
                            className={cn(
                              "grid w-full min-w-[5.5rem] gap-0.5 rounded-lg px-1.5 py-1.5 text-center",
                              goneHere ? "bg-rose-700 hover:bg-rose-600" : id ? "bg-zinc-800 hover:bg-zinc-700" : "border-2 border-dashed border-rose-500/70",
                              cell?.slot === index && cell.table === t && "ring-2 ring-amber-300",
                            )}
                          >
                            <span className={cn("text-[10px] font-black", goneHere ? "text-white" : "text-emerald-300")}>
                              {tableTag(label)} · {time}
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
                          {formatClock(row.at)} {row.table == null ? "—" : row.table === 0 ? "휴식" : tableTag(labels[row.table - 1])}
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
                {tableTag(label)} · 다시 열기
              </button>
            ))}
          </p>
        ) : null}
      </section>

      </>
      ) : null}

      {/* 공유 탭: 보기 전용 링크(로그인 없이) · QR코드 · TV 화면 */}
      {tab === "share" ? (
      <section aria-label="공유" className="grid gap-2 rounded-2xl border border-white/15 bg-black p-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-base font-black">딜러에게 공유</h2>
          <span className="text-xs text-zinc-400">링크를 받은 사람은 보기만 할 수 있습니다(고치기 불가). 이 게임만 보이고, 다른 게임·계정은 안 보입니다.</span>
        </div>
        {shareUrl ? (
          <div className="flex flex-wrap items-center gap-1.5">
            <input readOnly value={shareUrl} aria-label="공유 링크" className="h-10 min-w-0 flex-1 rounded-lg border border-white/20 bg-zinc-900 px-2 text-sm" />
            <button
              type="button"
              onClick={async () => {
                await navigator.clipboard.writeText(shareUrl).catch(() => undefined);
                setLinkCopied(true);
                window.setTimeout(() => setLinkCopied(false), 1500);
              }}
              className="min-h-10 rounded-lg bg-[#FEE500] px-3 text-sm font-black text-black"
            >
              {linkCopied ? "복사됨 ✓" : "링크 복사"}
            </button>
            <a href={`${shareUrl}?tv=1`} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center rounded-lg bg-white px-3 text-sm font-black text-black">
              TV 화면 열기
            </a>
            {qr ? (
              <a href={qr} download={`${state.game.name.replace(/[\\/:*?"<>|\s]+/g, "_")}_교대표_QR.png`} className="inline-flex min-h-10 items-center rounded-lg bg-white px-3 text-sm font-black text-black">
                QR 저장
              </a>
            ) : null}
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                if (window.confirm("공유를 끌까요? 이 링크로는 더 이상 볼 수 없습니다.")) void send({ type: "setShare", on: false });
              }}
              className="min-h-10 rounded-lg border border-rose-500/70 px-3 text-sm font-black text-rose-300"
            >
              공유 끄기
            </button>
          </div>
        ) : null}
        {shareUrl && qr ? (
          <div className="flex flex-wrap items-center gap-3 rounded-xl bg-zinc-900 p-2">
            {/* eslint-disable-next-line @next/next/no-img-element -- 브라우저에서 만든 QR 이미지 */}
            <img src={qr} alt="교대표 QR코드" data-qr className="size-36 rounded-lg bg-white p-1" />
            <p className="min-w-0 flex-1 text-sm text-zinc-300">
              대기실에 붙여 두면 딜러들이 폰 카메라로 찍기만 해도 교대표가 열립니다. <b className="text-white">QR 저장</b>으로 내려받아 인쇄하세요.
              <br />
              <span className="text-xs text-zinc-400">링크는 근무일 다음 날까지만 열리고 그 뒤에는 자동으로 닫힙니다.</span>
            </p>
          </div>
        ) : null}
        {shareUrl ? null : (
          <button
            type="button"
            disabled={busy}
            onClick={() => void send({ type: "setShare", on: true })}
            className="min-h-11 justify-self-start rounded-lg bg-sky-500 px-4 text-sm font-black text-black"
          >
            보기 전용 링크 만들기
          </button>
        )}
      </section>

      ) : null}

      {/* 딜러 탭 */}
      {tab === "dealers" ? (
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
        <details className="group rounded-xl border border-white/15 bg-zinc-950 p-2" open={regOpen} onToggle={(e) => setRegOpen(e.currentTarget.open)}>
          <FoldHead>딜러 등록 (한 줄에 한 명 · 예: 김딜러 10:00 또는 김딜러 18:00-02:00 · 최대 {MAX_DEALERS}명)</FoldHead>
          <div className="mt-2 grid gap-2">
            <textarea
              value={bulk}
              onChange={(event) => setBulk(event.target.value)}
              rows={4}
              className="rounded-lg border border-white/20 bg-black p-2 text-base"
              placeholder={"김딜러 10:00\n이딜러 10:00-18:00\n박딜러 18:00-02:00"}
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
            {!bulk.trim() ? (
              <button
                type="button"
                onClick={() => setBulk(["김딜러", "이딜러", "박딜러", "최딜러", "정딜러", "강딜러"].map((n) => `${n} ${state.planStart}`).join("\n"))}
                className="min-h-10 justify-self-start rounded-lg border border-white/25 px-3 text-sm font-bold text-zinc-300 hover:bg-white/10"
              >
                예시로 채워 보기
              </button>
            ) : null}
          </div>
        </details>

        {/* 따로 적어 두는 딜러 명단(게임과 상관없이 남음 · 새 게임에서 불러오기) */}
        <section data-rosters aria-label="저장한 딜러 명단" className="grid gap-2 rounded-xl border border-sky-500/40 bg-sky-950/20 p-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <h3 className="text-sm font-black text-sky-200">📋 저장한 딜러 명단 ({state.rosters.length}/{MAX_ROSTERS})</h3>
            <span className="text-xs text-zinc-400">게임을 지워도 남아요. 새 게임에서 한 번에 불러오기</span>
          </div>
          {state.rosters.length ? (
            <ul className="grid gap-1.5 sm:grid-cols-2">
              {state.rosters.map((r) => (
                <li key={r.id} data-roster={r.name} className="grid gap-1.5 rounded-lg border border-white/15 bg-black/50 p-2">
                  <span className="flex min-w-0 items-baseline gap-1.5">
                    <b className="truncate text-sm text-white">{r.name}</b>
                    <span className="shrink-0 text-xs text-zinc-400">{parseDealerLines(r.text).length}명</span>
                  </span>
                  <span className="line-clamp-2 text-xs text-zinc-400">{parseDealerLines(r.text).map((d) => d.name).join(", ")}</span>
                  <span className="flex flex-wrap gap-1">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={async () => {
                        const dealers = parseDealerLines(r.text);
                        if (dealers.length && window.confirm(`'${r.name}' ${dealers.length}명을 이 게임에 등록할까요?`)) await send({ type: "addDealers", dealers });
                      }}
                      className="min-h-9 rounded-lg bg-emerald-500 px-3 text-xs font-black text-black"
                    >
                      이 게임에 등록
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setBulk(r.text);
                        setRegOpen(true);
                      }}
                      className="min-h-9 rounded-lg border border-white/25 px-2.5 text-xs font-bold"
                    >
                      등록칸에 넣기
                    </button>
                    <button type="button" onClick={() => setRosterEdit({ id: r.id, name: r.name, text: r.text })} className="min-h-9 rounded-lg border border-white/25 px-2.5 text-xs font-bold">
                      고치기
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => window.confirm(`'${r.name}' 명단을 지울까요?`) && void send({ type: "deleteRoster", id: r.id })}
                      className="min-h-9 rounded-lg border border-rose-500/60 px-2.5 text-xs font-bold text-rose-300"
                    >
                      삭제
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
          {state.rosters.length < MAX_ROSTERS ? (
            <span className="flex flex-wrap gap-1.5">
              <button
                type="button"
                disabled={state.dealers.length === 0}
                onClick={() =>
                  setRosterEdit({
                    name: state.game.name,
                    text: state.dealers.map((d) => [d.name, d.startTime ? `${d.startTime}${d.endTime ? `-${d.endTime}` : ""}` : ""].filter(Boolean).join(" ")).join("\n"),
                  })
                }
                className="min-h-10 rounded-lg bg-sky-500 px-3 text-sm font-black text-black disabled:opacity-40"
              >
                + 지금 딜러 {state.dealers.length}명을 명단으로 저장
              </button>
              <button type="button" onClick={() => setRosterEdit({ name: "", text: "" })} className="min-h-10 rounded-lg border border-sky-400/60 px-3 text-sm font-bold text-sky-200">
                + 새 명단 적기
              </button>
            </span>
          ) : null}
        </section>
      </section>
      ) : null}

      {/* 딜러 명단 저장 · 고치기 */}
      {rosterEdit ? (
        <ToolDialog label="딜러 명단" onClose={() => setRosterEdit(null)}>
          <div className="grid w-full max-w-md gap-3 rounded-2xl border border-white/20 bg-zinc-950 p-4">
            <h3 className="text-lg font-black">{rosterEdit.id ? "딜러 명단 고치기" : "딜러 명단 저장"}</h3>
            <label className="grid gap-1 text-sm font-bold">
              명단 이름
              <input
                value={rosterEdit.name}
                maxLength={20}
                placeholder="예: 주간조, 야간조, 대회 지원"
                onChange={(e) => setRosterEdit({ ...rosterEdit, name: e.target.value })}
                className="h-11 rounded-lg border border-white/20 bg-black px-2 text-base"
              />
            </label>
            <label className="grid gap-1 text-sm font-bold">
              딜러 (한 줄에 한 명 · 출근 시간은 빼도 돼요)
              <textarea
                value={rosterEdit.text}
                rows={8}
                placeholder={"김딜러 10:00\n이딜러 10:00-18:00\n박딜러"}
                onChange={(e) => setRosterEdit({ ...rosterEdit, text: e.target.value })}
                className="rounded-lg border border-white/20 bg-black p-2 text-base"
              />
            </label>
            <p className="text-xs text-zinc-400">{parseDealerLines(rosterEdit.text).length}명</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy || !rosterEdit.text.trim()}
                onClick={async () => {
                  if (await send({ type: "saveRoster", id: rosterEdit.id, name: rosterEdit.name, text: rosterEdit.text })) setRosterEdit(null);
                }}
                className="min-h-11 rounded-lg bg-sky-500 px-4 text-sm font-black text-black disabled:opacity-40"
              >
                저장
              </button>
              <button type="button" onClick={() => setRosterEdit(null)} className="ml-auto min-h-11 rounded-lg border border-white/30 px-4 text-sm font-bold">
                닫기
              </button>
            </div>
          </div>
        </ToolDialog>
      ) : null}

      {/* 시간 바꾸기 */}
      {plan && timeEdit ? (
        <ToolDialog label="시간 바꾸기" onClose={() => setTimeEdit(null)}>
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
        </ToolDialog>
      ) : null}

      {/* 칸 바꾸기 */}
      {plan && cell && candidates ? (
        <ToolDialog label="칸 바꾸기" onClose={() => setCell(null)} className="place-items-end p-3 sm:place-items-center">
          <div className="grid max-h-[85dvh] w-full max-w-lg gap-3 overflow-y-auto rounded-2xl border border-white/20 bg-zinc-950 p-4">
            <h3 className="text-lg font-black">
              {formatClock(candidates.slot.at)} · {tableTag(labels[cell.table])}{" "}
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
                      {name(id)} <span className="text-[10px] text-zinc-400">{tableTag(labels[t])}</span>
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
        </ToolDialog>
      ) : null}

      {/* 새 게임 · 날짜 변경 · 이름/날짜 고치기 */}
      {gameDialog ? (
        <ToolDialog label="게임" onClose={() => setGameDialog(null)}>
          <div className="grid w-full max-w-sm gap-3 rounded-2xl border border-white/20 bg-zinc-950 p-4">
            <h3 className="text-lg font-black">
              {gameDialog.mode === "day" ? "날짜 변경(새 근무일)" : gameDialog.mode === "new" ? "새 게임" : "이름·날짜 고치기"}
            </h3>
            <p className="text-xs text-zinc-400">
              {gameDialog.mode === "edit"
                ? "지금 게임의 이름과 날짜만 바꿉니다."
                : "새 게임은 딜러 0명 · 테이블 0개로 새로 시작합니다. 지금 게임은 그대로 남고, 위 목록에서 언제든 다시 볼 수 있습니다."}
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
                placeholder="예: POKA DAY-1"
                maxLength={30}
                onChange={(e) => setGameDialog({ ...gameDialog, name: e.target.value })}
                className="h-11 rounded-lg border border-white/20 bg-black px-2 text-base"
              />
            </label>
            {gameDialog.mode !== "edit" ? (
              <>
                {gameDialog.mode === "day" ? (
                <label className="flex items-center gap-2 text-sm font-bold">
                  <input
                    type="checkbox"
                    checked={gameDialog.copyDealers}
                    onChange={(e) => setGameDialog({ ...gameDialog, copyDealers: e.target.checked })}
                    className="size-5"
                  />
                  지금 딜러 명단 가져오기 <span className="text-xs text-zinc-400">(출근 기록은 비움)</span>
                </label>
                ) : null}
                <label className="flex items-center gap-2 text-sm font-bold">
                  <input
                    type="checkbox"
                    checked={gameDialog.copySettings}
                    onChange={(e) => setGameDialog({ ...gameDialog, copySettings: e.target.checked })}
                    className="size-5"
                  />
                  시간 설정 가져오기 <span className="text-xs text-zinc-400">(교대 간격 · 시작/끝 시간 · 최대 연속 딜)</span>
                </label>
                {state.rosters.length ? (
                  <label className="grid gap-1 text-sm font-bold">
                    📋 저장한 딜러 명단 불러오기
                    <select
                      aria-label="저장한 딜러 명단"
                      value={gameDialog.rosterId ?? ""}
                      onChange={(e) => setGameDialog({ ...gameDialog, rosterId: e.target.value || undefined })}
                      className="h-11 rounded-lg border border-white/20 bg-black px-2 text-base"
                    >
                      <option value="">불러오지 않음(딜러 0명)</option>
                      {state.rosters.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name} · {parseDealerLines(r.text).length}명
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}
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
                    if (!window.confirm(`'${state.game.name}' 게임을 지울까요? ${TRASH_DAYS}일 동안 휴지통에 남아 그 안에는 되살릴 수 있어요.`)) return;
                    if (await send({ type: "deleteGame" })) setGameDialog(null);
                  }}
                  className="min-h-11 rounded-lg bg-rose-600 px-4 text-sm font-black text-white"
                >
                  게임 삭제
                </button>
              ) : null}
              {gameDialog.mode === "edit" && (state.games.length > 1 || state.trash.length > 0) ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setGameDialog(null);
                    setCleanup([]);
                  }}
                  className="min-h-11 rounded-lg border border-amber-400/70 px-3 text-sm font-black text-amber-300"
                >
                  지난 게임 정리{state.trash.length ? ` · 휴지통 ${state.trash.length}` : ""}
                </button>
              ) : null}
              <button type="button" onClick={() => setGameDialog(null)} className="ml-auto min-h-11 rounded-lg border border-white/30 px-4 text-sm font-bold">
                닫기
              </button>
            </div>
          </div>
        </ToolDialog>
      ) : null}

      {/* 지난 게임 정리: 지금 보는 게임 말고 나머지를 오래된 순으로 골라 한꺼번에 지움 */}
      {cleanup ? (
        <ToolDialog label="지난 게임 정리" onClose={() => setCleanup(null)}>
          <div className="grid max-h-[90dvh] w-full max-w-md grid-rows-[auto_auto_minmax(0,1fr)_auto_auto] gap-3 rounded-2xl border border-white/20 bg-zinc-950 p-4">
            <h3 className="text-lg font-black">지난 게임 정리 · {state.games.length}/{MAX_GAMES}개</h3>
            {(() => {
              const others = state.games.filter((g) => g.id !== state.game.id);
              const today = kstDate();
              const past = others.filter((g) => !g.workDate || g.workDate < today).map((g) => g.id);
              return (
                <div className="flex flex-wrap gap-1.5 text-xs">
                  <button type="button" onClick={() => setCleanup(past)} className="min-h-10 rounded-lg border border-white/25 px-3 font-bold">
                    오늘 이전 전부({past.length})
                  </button>
                  <button type="button" onClick={() => setCleanup([])} className="min-h-10 rounded-lg border border-white/25 px-3 font-bold">
                    선택 해제
                  </button>
                  <span className="self-center text-zinc-400">지금 보는 게임은 지울 수 없어요.</span>
                </div>
              );
            })()}
            <ul className="grid content-start gap-1 overflow-y-auto overscroll-contain pr-1">
              {state.games
                .filter((g) => g.id !== state.game.id)
                .slice()
                .reverse()
                .map((g) => {
                  const checked = cleanup.includes(g.id);
                  return (
                    <li key={g.id}>
                      <label className={cn("flex min-h-11 items-center gap-2 rounded-lg border px-2 text-sm font-bold", checked ? "border-rose-500/70 bg-rose-950/50" : "border-white/15")}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => setCleanup(e.target.checked ? [...cleanup, g.id] : cleanup.filter((id) => id !== g.id))}
                          className="size-5"
                        />
                        <span className="shrink-0 text-zinc-400">{formatWorkDate(g.workDate)}</span>
                        <span className="min-w-0 truncate">{g.name}</span>
                      </label>
                    </li>
                  );
                })}
            </ul>
            {/* 휴지통: 지운 지 TRASH_DAYS일 안이면 되살리기 */}
            <details data-trash className="group rounded-xl border border-white/15 bg-black/40 p-2" open={state.trash.length > 0 && state.games.length <= 1}>
              <summary className="flex min-h-10 cursor-pointer list-none items-center gap-2 text-sm font-bold [&::-webkit-details-marker]:hidden">
                🗑 휴지통 {state.trash.length}개
                <span className="text-xs font-normal text-zinc-400">지운 지 {TRASH_DAYS}일 안이면 되살릴 수 있어요</span>
                <span className="ml-auto text-xs text-amber-300 group-open:hidden">펼치기</span>
              </summary>
              {state.trash.length ? (
                <ul className="mt-1 grid max-h-40 gap-1 overflow-y-auto overscroll-contain pr-1">
                  {state.trash.map((g) => {
                    const left = Math.max(0, TRASH_DAYS - Math.floor((clock.getTime() - Date.parse(g.deletedAt)) / 86_400_000));
                    return (
                      <li key={g.id} className="flex min-h-10 items-center gap-2 rounded-lg border border-white/10 px-2 text-sm">
                        <span className="shrink-0 text-zinc-400">{formatWorkDate(g.workDate)}</span>
                        <span className="min-w-0 flex-1 truncate font-bold">{g.name}</span>
                        <span className="shrink-0 text-[11px] text-zinc-500">{left}일 남음</span>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void send({ type: "restoreGame", trashId: g.id })}
                          className="min-h-9 shrink-0 rounded-lg bg-emerald-500 px-3 text-xs font-black text-black"
                        >
                          되살리기
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="mt-1 text-xs text-zinc-400">비어 있어요.</p>
              )}
            </details>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy || cleanup.length === 0}
                onClick={async () => {
                  if (!window.confirm(`고른 게임 ${cleanup.length}개를 지울까요? ${TRASH_DAYS}일 동안 휴지통에 남아 그 안에는 되살릴 수 있어요.`)) return;
                  if (await send({ type: "deleteGames", ids: cleanup })) setCleanup(null);
                }}
                className="min-h-11 rounded-lg bg-rose-600 px-4 text-sm font-black text-white disabled:opacity-40"
              >
                {cleanup.length}개 지우기
              </button>
              <button type="button" onClick={() => setCleanup(null)} className="ml-auto min-h-11 rounded-lg border border-white/30 px-4 text-sm font-bold">
                닫기
              </button>
            </div>
          </div>
        </ToolDialog>
      ) : null}

      {/* 출근·퇴근 시간 바꾸기 */}
      {times ? (
        <ToolDialog label="출근·퇴근 시간" onClose={() => setTimes(null)}>
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
        </ToolDialog>
      ) : null}

      {/* 딜러 수정 */}
      {editing ? (
        <ToolDialog label="딜러 수정" onClose={() => setEditing(null)}>
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
        </ToolDialog>
      ) : null}
    </div>
  );
}
