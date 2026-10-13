"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { cn } from "cn";
import { BOARD_LIMITS, PRIZE_COLORS, clockText, clockView, defaultPrizeColor, makeStructure, type BoardLevel, type ClockOp, type GameBoardData, type PrizeColor, type PrizeRow } from "@/lib/game-board";
import { BUILD_ID } from "@/lib/build-id";
import type { BoardState, BoardSummary } from "@/lib/game-board-server";
import { GameBoardScreen, useServerNow } from "@/components/tools/game-board-screen";
import { shrinkPhoto } from "@/lib/poster-fit";

const POLL_MS = 3000;
const SAVE_DELAY = 600;
const API = "/api/tools/game-board";
const noop = () => () => {};
const useInBrowser = () => useSyncExternalStore(noop, () => true, () => false);
const won = (n: number) => Math.round(n).toLocaleString("ko-KR");
const readNum = (s: string) => Number(String(s).replace(/[^\d]/g, "")) || 0;

async function call(body: object) {
  const res = await fetch(API, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const json = (await res.json().catch(() => ({}))) as { error?: string; board?: BoardState; boards?: BoardSummary[]; id?: string };
  if (!res.ok) throw new Error(json.error ?? "저장하지 못했습니다.");
  return json;
}

/** 게임 현황판 관리: 내 현황판 고르기 · 시계 조작 · 인원 · 설정 · 블라인드 구조 · TV 화면 · 보기 링크 */
export function GameBoardPanel({ initialBoards, initialBoard }: { initialBoards: BoardSummary[]; initialBoard: BoardState | null }) {
  const [boards, setBoards] = useState(initialBoards);
  const [board, setBoard] = useState<BoardState | null>(initialBoard);
  const [draft, setDraft] = useState<GameBoardData | null>(initialBoard?.data ?? null);
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [tv, setTv] = useState(false);
  const [tab, setTab] = useState<"play" | "prize" | "setup">("play");
  const dirty = useRef(false);
  const saveTimer = useRef<number | null>(null);
  // 화면에 보이는 최신 입력(빠르게 연달아 바꿔도 늘 이걸 바탕으로) · 몇 번째 입력인지
  const draftRef = useRef<GameBoardData | null>(initialBoard?.data ?? null);
  const editSeq = useRef(0);
  const showDraft = useCallback((d: GameBoardData | null) => {
    draftRef.current = d;
    setDraft(d);
  }, []);
  const inBrowser = useInBrowser();
  const now = useServerNow(initialBoard?.serverNow ?? 0, offset);

  /** 서버에서 받은 현황판 반영. 저장 안 된 입력이 있으면 입력은 그대로 두고 시계만 맞춤 */
  const take = useCallback(
    (next: BoardState) => {
      setBoard(next);
      setOffset(next.serverNow - Date.now());
      if (!dirty.current) showDraft(next.data);
      else if (draftRef.current) showDraft({ ...draftRef.current, clock: next.data.clock });
    },
    [showDraft],
  );

  // 다른 기기(휴대폰으로 조작 · 노트북 TV)와 맞추기: 바뀐 게 있을 때만 받아 옴
  const version = board?.version ?? -1;
  const boardId = board?.id ?? null;
  useEffect(() => {
    if (!boardId) return;
    let stop = false;
    const poll = async () => {
      if (dirty.current || document.hidden) return;
      const res = await fetch(`${API}?id=${encodeURIComponent(boardId)}&v=${version}`, { cache: "no-store" }).catch(() => null);
      const json = res?.ok ? ((await res.json().catch(() => null)) as { changed: boolean; board?: BoardState; serverNow?: number; build?: string } | null) : null;
      if (stop || !json) return;
      // 새로 배포됐으면 새 화면으로(저장 안 된 입력이 있으면 위에서 이미 건너뜀)
      if (json.build && json.build !== BUILD_ID) return window.location.reload();
      if (json.changed && json.board) take(json.board);
      else if (json.serverNow) setOffset(json.serverNow - Date.now());
    };
    const timer = window.setInterval(poll, POLL_MS);
    document.addEventListener("visibilitychange", poll);
    return () => {
      stop = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", poll);
    };
  }, [boardId, version, take]);

  // 처음 열 때 서버 시각 맞추기
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 내 시계와 서버 시각 차이는 브라우저에서만 잴 수 있음
    if (initialBoard) setOffset(initialBoard.serverNow - Date.now());
  }, [initialBoard]);

  /** 설정 · 인원 바꾸기: 화면에 바로 보이고 잠깐 뒤 저장 */
  function edit(change: Partial<GameBoardData>) {
    const base = draftRef.current;
    if (!base || !board) return;
    const next = { ...base, ...change };
    showDraft(next);
    dirty.current = true;
    const seq = ++editSeq.current;
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    const id = board.id;
    saveTimer.current = window.setTimeout(async () => {
      try {
        const json = await call({ action: "save", id, data: next });
        // 저장하는 동안 또 입력했으면(더 새 입력) 이 답은 화면에 덮어쓰지 않음 — 되돌아가던 문제
        if (seq !== editSeq.current) return;
        dirty.current = false;
        if (json.board) take(json.board);
        setError(null);
      } catch (e) {
        if (seq === editSeq.current) dirty.current = false;
        setError((e as Error).message);
      }
    }, SAVE_DELAY);
  }

  async function clock(op: ClockOp) {
    if (!board) return;
    try {
      const json = await call({ action: "clock", id: board.id, clock: op });
      if (json.board) take(json.board);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function open(id: string) {
    const res = await fetch(`${API}?id=${encodeURIComponent(id)}`, { cache: "no-store" });
    const json = (await res.json().catch(() => ({}))) as { board?: BoardState };
    if (json.board) {
      // 다른 현황판으로 바꾸면, 앞 현황판의 저장 답이 이 화면을 덮지 않게
      editSeq.current++;
      dirty.current = false;
      showDraft(json.board.data);
      take(json.board);
      window.history.replaceState(null, "", `/tools/board?id=${encodeURIComponent(id)}`);
    }
  }

  async function create() {
    const name = window.prompt("현황판 이름(예: 메인 토너먼트, 데일리 터보)", "메인 토너먼트");
    if (name === null) return;
    try {
      const json = await call({ action: "create", name });
      if (json.boards) setBoards(json.boards);
      if (json.board) {
        // 다른 현황판으로 바꾸면, 앞 현황판의 저장 답이 이 화면을 덮지 않게
        editSeq.current++;
        dirty.current = false;
        showDraft(json.board.data);
        take(json.board);
        setTab("setup");
        window.history.replaceState(null, "", `/tools/board?id=${encodeURIComponent(json.board.id)}`);
      }
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function remove() {
    if (!board || !window.confirm(`"${board.name}" 현황판을 지울까요? 되돌릴 수 없습니다.`)) return;
    const json = await call({ action: "delete", id: board.id }).catch((e: Error) => (setError(e.message), null));
    if (!json) return;
    setBoards(json.boards ?? []);
    setBoard(null);
    showDraft(null);
    window.history.replaceState(null, "", "/tools/board");
    const first = json.boards?.[0];
    if (first) void open(first.id);
  }

  async function share(on: boolean) {
    if (!board) return;
    const json = await call({ action: "share", id: board.id, on }).catch((e: Error) => (setError(e.message), null));
    if (json?.board) take(json.board);
  }

  // TV 화면: 스페이스 = 시작/멈춤, ← → = 레벨, Esc = 닫기
  const running = draft ? draft.clock.runningSince != null : false;
  useEffect(() => {
    if (!tv) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === " ") {
        e.preventDefault();
        void clock({ op: running ? "pause" : "start" });
      } else if (e.key === "ArrowRight") void clock({ op: "next" });
      else if (e.key === "ArrowLeft") void clock({ op: "prev" });
      else if (e.key === "Escape") void closeTv();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  async function openTv() {
    setTv(true);
    try {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen?.();
      // 휴대폰이면 가로로 돌려 크게(안 되는 기기는 그대로)
      await (screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> }).lock?.("landscape").catch(() => undefined);
    } catch {
      /* 전체 화면을 못 해도 TV 화면은 그대로 */
    }
  }
  async function closeTv() {
    setTv(false);
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
    } catch {
      /* 무시 */
    }
  }

  const origin = inBrowser ? window.location.origin : "";
  const shareUrl = board?.shareToken && origin ? `${origin}/g/${board.shareToken}` : null;

  return (
    <div className="grid gap-4">
      {/* 내 현황판 고르기 */}
      <section className="ink-panel grid gap-2 rounded-2xl p-3 sm:p-4">
        <div className="flex flex-wrap items-center gap-2">
          <label className="grid min-w-0 flex-1 gap-1 text-xs font-bold text-zinc-300">
            내 현황판 · 내 계정에만 보여요
            <select
              aria-label="현황판 고르기"
              value={board?.id ?? ""}
              onChange={(e) => void open(e.target.value)}
              className="h-11 w-full min-w-0 rounded-lg border border-white/20 bg-black px-2 text-base font-bold text-white"
            >
              {!board ? <option value="">현황판을 만들어 주세요</option> : null}
              {boards.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
          <button type="button" onClick={() => void create()} className="min-h-11 self-end rounded-xl bg-amber-400 px-4 text-sm font-black text-black">
            + 새 현황판
          </button>
          {board ? (
            <button type="button" onClick={() => void remove()} className="min-h-11 self-end rounded-xl border border-rose-400/60 px-3 text-sm font-bold text-rose-200">
              삭제
            </button>
          ) : null}
        </div>
        {error ? <p className="text-sm font-bold text-rose-300">{error}</p> : null}
      </section>

      {!board || !draft ? (
        <section className="ink-panel grid justify-items-center gap-3 rounded-2xl px-4 py-10 text-center">
          <p className="text-base text-[#D1D5DB]">아직 현황판이 없습니다. 게임마다 하나씩 만들어 TV에 띄우세요.</p>
          <button type="button" onClick={() => void create()} className="min-h-12 rounded-xl bg-amber-400 px-6 text-base font-black text-black">
            첫 현황판 만들기
          </button>
        </section>
      ) : (
        <>
          {/* 탭: 크게 · 눈에 띄게 */}
          <nav role="tablist" aria-label="현황판 메뉴" className="grid grid-cols-3 gap-1.5 rounded-2xl border-2 border-amber-400/50 bg-black p-1.5">
            {(
              [
                ["play", "⏱", "진행", "시계 · 인원 · 칩"],
                ["prize", "🏆", "프라이즈", "순위 · 금액 · 색"],
                ["setup", "⚙️", "설정", "이름 · 블라인드 · 레지"],
              ] as const
            ).map(([key, icon, label, hint]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={tab === key}
                aria-label={label}
                onClick={() => setTab(key)}
                className={cn("grid min-h-16 content-center justify-items-center gap-0.5 rounded-xl px-1 py-2 transition-colors", tab === key ? "bg-amber-400 text-black shadow-lg" : "bg-white/5 text-white hover:bg-white/10")}
              >
                <span className="flex items-center gap-1.5 text-base font-black sm:text-lg">
                  <span aria-hidden>{icon}</span>
                  {label}
                </span>
                <span className={cn("text-[11px] font-bold", tab === key ? "text-black/70" : "text-zinc-400")}>{hint}</span>
              </button>
            ))}
          </nav>

          {/* 미리보기(TV 화면을 그대로 줄여서) + TV 버튼 */}
          <section className="grid gap-2">
            <ScaledPreview data={draft} now={now} />
            <button type="button" onClick={() => void openTv()} className="min-h-14 rounded-2xl bg-amber-400 px-5 text-lg font-black text-black shadow-[0_6px_20px_rgba(251,191,36,.25)]">
              📺 TV 화면으로 띄우기
            </button>
          </section>

          {tab === "play" ? <PlayControls data={draft} now={now} onClock={clock} onEdit={edit} /> : tab === "prize" ? <PrizeForm data={draft} onEdit={edit} /> : <SetupForm data={draft} current={clockView(draft, now).index} onEdit={edit} onJump={(index) => void clock({ op: "jump", index })} />}

          {/* 보기 전용 링크 */}
          <section className="ink-panel grid gap-2 rounded-2xl p-3 sm:p-4">
            <h2 className="text-base font-black text-white">다른 TV · 기기에서 보기</h2>
            <p className="text-sm text-[#D1D5DB]">
              현황판은 <b className="text-white">내 계정에만 보입니다.</b> 매장 TV에 로그인하기 어렵다면 보기 전용 링크를 켜세요. 링크를 아는 사람만 볼 수 있고(조작은 못 함), 끄면 바로 막힙니다.
            </p>
            {shareUrl ? (
              <div className="grid gap-2">
                <div className="flex flex-wrap gap-2">
                  <input readOnly aria-label="보기 링크" value={shareUrl} onFocus={(e) => e.currentTarget.select()} className="h-11 min-w-0 flex-1 rounded-lg border border-white/20 bg-black px-2 text-sm text-white" />
                  <button type="button" onClick={() => void navigator.clipboard?.writeText(shareUrl)} className="min-h-11 rounded-xl bg-white px-4 text-sm font-black text-black">
                    복사
                  </button>
                  <a href={shareUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center rounded-xl border border-white/25 px-4 text-sm font-bold text-white">
                    열기
                  </a>
                </div>
                <button type="button" onClick={() => void share(false)} className="min-h-10 justify-self-start rounded-xl border border-rose-400/60 px-4 text-sm font-bold text-rose-200">
                  보기 링크 끄기
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => void share(true)} className="min-h-11 justify-self-start rounded-xl border border-[#c9a25c]/70 px-4 text-sm font-black text-[#f3d9a4]">
                보기 전용 링크 켜기
              </button>
            )}
          </section>

          {tv && inBrowser
            ? createPortal(
                <div data-board-tv className="fixed inset-0 z-[9999] bg-black">
                  <GameBoardScreen data={draft} now={now} sound />
                  <div className="absolute right-3 bottom-3 flex gap-2 opacity-30 transition-opacity hover:opacity-100 focus-within:opacity-100">
                    <button type="button" onClick={() => void clock({ op: "prev" })} className="rounded-lg bg-white/15 px-3 py-2 text-sm font-black">
                      ◀ 이전
                    </button>
                    <button type="button" onClick={() => void clock({ op: running ? "pause" : "start" })} className="rounded-lg bg-white/15 px-3 py-2 text-sm font-black">
                      {running ? "⏸ 멈춤" : "▶ 시작"}
                    </button>
                    <button type="button" onClick={() => void clock({ op: "next" })} className="rounded-lg bg-white/15 px-3 py-2 text-sm font-black">
                      다음 ▶
                    </button>
                    <button type="button" onClick={() => void closeTv()} className="rounded-lg bg-white/15 px-3 py-2 text-sm font-black">
                      ✕ 닫기
                    </button>
                  </div>
                </div>,
                document.body,
              )
            : null}
        </>
      )}
    </div>
  );
}

/* ───────────── 진행: 시계 조작 · 인원 ───────────── */

function PlayControls({ data, now, onClock, onEdit }: { data: GameBoardData; now: number; onClock: (op: ClockOp) => void; onEdit: (c: Partial<GameBoardData>) => void }) {
  const view = clockView(data, now);
  const running = data.clock.runningSince != null && !view.finished;
  const btn = "min-h-12 rounded-xl border border-white/20 bg-black px-3 text-base font-black text-white active:bg-white/10";
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="ink-panel grid gap-3 rounded-2xl p-3 sm:p-4">
        <h2 className="flex items-baseline justify-between text-base font-black text-white">
          시계
          <span className="text-sm font-bold text-zinc-400 tabular-nums">
            {view.level.isBreak ? "휴식" : `레벨 ${view.number}`} · {clockText(view.remainingMs)}
          </span>
        </h2>
        <button type="button" onClick={() => onClock({ op: running ? "pause" : "start" })} className={cn("min-h-16 rounded-2xl text-2xl font-black", running ? "bg-rose-600 text-white" : "bg-emerald-500 text-black")}>
          {running ? "⏸ 멈춤" : view.finished ? "끝(처음부터 다시)" : "▶ 시작"}
        </button>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => onClock({ op: "prev" })} className={btn}>
            ◀ 이전 레벨
          </button>
          <button type="button" onClick={() => onClock({ op: "next" })} className={btn}>
            다음 레벨 ▶
          </button>
          <button type="button" onClick={() => onClock({ op: "add", ms: -60_000 })} className={btn}>
            −1분
          </button>
          <button type="button" onClick={() => onClock({ op: "add", ms: 60_000 })} className={btn}>
            +1분
          </button>
        </div>
        <button
          type="button"
          onClick={() => window.confirm("레벨 1 처음으로 되돌릴까요? 시계가 멈춥니다.") && onClock({ op: "reset" })}
          className="min-h-10 justify-self-start rounded-xl border border-white/15 px-4 text-sm font-bold text-zinc-300"
        >
          처음부터(레벨 1)
        </button>
        <p className="text-xs text-zinc-500">이전 레벨: 레벨이 시작된 지 10초가 넘었으면 이번 레벨을 처음부터 다시 셉니다. TV 화면에서는 스페이스 = 시작/멈춤, ← → = 레벨.</p>
      </section>

      <section className="ink-panel grid content-start gap-2 rounded-2xl p-3 sm:p-4">
        <h2 className="flex items-baseline justify-between text-base font-black text-white">
          플레이어
          <span className="text-sm font-bold text-zinc-400 tabular-nums">
            화면: {won(data.remaining)} / {won(data.entries)}
          </span>
        </h2>
        <Counter label="플레이 중" hint="탈락하면 −1 · 숫자 칸을 눌러 바로 고칠 수 있어요" value={data.remaining} onChange={(v) => onEdit({ remaining: v })} />
        <Counter label="바인" hint="+1 하면 플레이 중도 +1" value={data.entries} onChange={(v) => onEdit({ entries: v, remaining: Math.max(0, data.remaining + (v - data.entries)) })} />
        <Counter label="리바인" hint="리바인 수만 올라가요(바인 · 플레이 중은 그대로)" value={data.rebuys} onChange={(v) => onEdit({ rebuys: v })} />
        <Counter label="얼리" hint="얼리칩 받은 수" value={data.earlies} onChange={(v) => onEdit({ earlies: v })} />
        <label className="flex min-h-11 items-center gap-2 rounded-xl bg-black/50 px-3 text-sm font-black text-white">
          <input type="checkbox" checked={data.addonOn} onChange={(e) => onEdit({ addonOn: e.target.checked })} className="size-5 accent-amber-400" />
          애드온 화면에 보이기
          <span className="ml-auto text-xs font-bold text-zinc-500">끄면 화면 · 총 칩에서 빠짐</span>
        </label>
        {data.addonOn ? <Counter label="애드온" value={data.addons} onChange={(v) => onEdit({ addons: v })} /> : null}

        <h3 className="mt-2 text-sm font-black text-white">칩(1명당) — 총 칩 · 평균 스택 계산</h3>
        <div data-chip-inputs className="grid grid-cols-2 gap-2">
          {(
            [
              ["startStack", "바인 칩(시작 스택)"],
              ["rebuyStack", "리바인 칩"],
              ["earlyStack", "얼리칩"],
              ...(data.addonOn ? ([["addonStack", "애드온 칩"]] as const) : []),
            ] as const
          ).map(([key, text]) => (
            <label key={key} className="grid min-w-0 gap-1 text-xs font-bold text-zinc-300">
              {text}
              <input
                aria-label={text}
                inputMode="numeric"
                value={won(data[key])}
                onChange={(e) => onEdit({ [key]: Math.min(BOARD_LIMITS.chips, readNum(e.target.value)) })}
                className="h-11 w-full min-w-0 rounded-lg border border-white/20 bg-black px-2 text-base font-black text-white tabular-nums"
              />
            </label>
          ))}
        </div>
      </section>
    </div>
  );
}

function Counter({ label, hint, value, onChange }: { label: string; hint?: string; value: number; onChange: (v: number) => void }) {
  const set = (v: number) => onChange(Math.min(BOARD_LIMITS.players, Math.max(0, v)));
  return (
    <div data-counter={label} className="flex items-center gap-2 rounded-xl bg-black/50 px-2 py-1.5">
      <span className="grid min-w-0 flex-1">
        <span className="text-sm font-black text-white">{label}</span>
        {hint ? <span className="text-[11px] text-zinc-500">{hint}</span> : null}
      </span>
      <button type="button" aria-label={`${label} 빼기`} onClick={() => set(value - 1)} className="size-11 shrink-0 rounded-lg border border-white/20 text-xl font-black">
        −
      </button>
      <input aria-label={label} inputMode="numeric" value={value ? won(value) : "0"} onChange={(e) => set(readNum(e.target.value))} className="h-11 w-20 min-w-0 rounded-lg border border-white/20 bg-black text-center text-lg font-black tabular-nums" />
      <button type="button" aria-label={`${label} 더하기`} onClick={() => set(value + 1)} className="size-11 shrink-0 rounded-lg bg-amber-400 text-xl font-black text-black">
        +
      </button>
    </div>
  );
}

/* ───────────── 설정 · 블라인드 구조 ───────────── */

function SetupForm({ data, current, onEdit, onJump }: { data: GameBoardData; current: number; onEdit: (c: Partial<GameBoardData>) => void; onJump: (index: number) => void }) {
  const [gen, setGen] = useState({ startBb: 200, minutes: 20, count: 16, breakEvery: 4, breakMinutes: 10 });
  const field = "h-11 w-full min-w-0 rounded-lg border border-white/20 bg-black px-2 text-base font-bold text-white";
  const label = "grid min-w-0 gap-1 text-xs font-bold text-zinc-300";
  const setLevel = (i: number, change: Partial<BoardLevel>) => onEdit({ levels: data.levels.map((l, j) => (j === i ? { ...l, ...change } : l)) });
  const lastBb = [...data.levels].reverse().find((l) => !l.isBreak)?.bb ?? 200;
  // 휴식 칸을 빼고 센 레벨 번호
  const numbers = data.levels.map((_, i) => data.levels.slice(0, i + 1).filter((l) => !l.isBreak).length);

  return (
    <div className="grid gap-4">
      <section className="ink-panel grid gap-3 rounded-2xl p-3 sm:p-4">
        <h2 className="text-base font-black text-white">기본 정보</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          <label className={label}>
            게임 이름
            <input value={data.name} maxLength={BOARD_LIMITS.name} onChange={(e) => onEdit({ name: e.target.value })} className={field} />
          </label>
          <label className={label}>
            작은 글씨(예: POKA DAY-1 · 바이인 5만)
            <input value={data.subtitle} maxLength={BOARD_LIMITS.subtitle} onChange={(e) => onEdit({ subtitle: e.target.value })} className={field} />
          </label>
        </div>
        <p className="text-xs text-zinc-500">칩(바인 · 리바인 · 얼리 · 애드온)은 진행 탭에서 바로 적을 수 있어요.</p>
        <label className={label}>
          등록 마감(이 레벨이 끝날 때까지 등록 가능)
          <select value={data.regLevel} onChange={(e) => onEdit({ regLevel: Number(e.target.value) })} className={field}>
            <option value={0}>표시 안 함</option>
            {Array.from({ length: data.levels.filter((l) => !l.isBreak).length }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                레벨 {i + 1} 끝날 때까지
              </option>
            ))}
          </select>
        </label>
        <label className={label}>
          흐르는 공지(화면 위쪽 · 비워 두면 안 나와요)
          <input value={data.notice} maxLength={BOARD_LIMITS.notice} onChange={(e) => onEdit({ notice: e.target.value })} placeholder="레지 마감은 레벨 8 종료까지 · 휴식 10분" className={field} />
        </label>
      </section>

      <BackgroundForm data={data} onEdit={onEdit} />

      <section className="ink-panel grid gap-3 rounded-2xl p-3 sm:p-4">
        <h2 className="text-base font-black text-white">블라인드 구조</h2>
        <details className="rounded-xl border border-white/10 bg-black/40 p-3">
          <summary className="cursor-pointer text-sm font-black text-amber-300">자동으로 만들기(시작 BB · 레벨 시간 · 휴식)</summary>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-5">
            {(
              [
                ["startBb", "시작 BB"],
                ["minutes", "레벨(분)"],
                ["count", "레벨 수"],
                ["breakEvery", "휴식: 몇 레벨마다(0=없음)"],
                ["breakMinutes", "휴식(분)"],
              ] as const
            ).map(([key, text]) => (
              <label key={key} className={label}>
                {text}
                <input inputMode="numeric" value={gen[key]} onChange={(e) => setGen({ ...gen, [key]: readNum(e.target.value) })} className={cn(field, "tabular-nums")} />
              </label>
            ))}
          </div>
          <button
            type="button"
            onClick={() => {
              if (!window.confirm("지금 블라인드 구조를 새로 만든 것으로 바꿀까요?")) return;
              onEdit({ levels: makeStructure({ startBb: Math.max(100, gen.startBb), minutes: Math.min(BOARD_LIMITS.minutes, Math.max(1, gen.minutes)), count: Math.min(40, Math.max(1, gen.count)), breakEvery: gen.breakEvery, breakMinutes: Math.max(1, gen.breakMinutes) }) });
            }}
            className="mt-2 min-h-11 rounded-xl bg-amber-400 px-4 text-sm font-black text-black"
          >
            이 값으로 구조 만들기
          </button>
          <p className="mt-1 text-xs text-zinc-500">BB 앤티 = BB, 칩은 100 단위로 맞춥니다. 만든 뒤 아래에서 한 칸씩 고칠 수 있어요.</p>
        </details>

        <div className="overflow-x-auto">
          <table data-levels className="w-full min-w-[34rem] text-sm">
            <thead>
              <tr className="text-left text-xs text-zinc-400">
                <th className="py-1 pr-1">레벨</th>
                <th className="px-1">SB</th>
                <th className="px-1">BB</th>
                <th className="px-1">BB 앤티</th>
                <th className="px-1">분</th>
                <th className="px-1" />
              </tr>
            </thead>
            <tbody>
              {data.levels.map((l, i) => {
                const number = numbers[i];
                const cell = "h-10 w-full min-w-0 rounded-md border border-white/15 bg-black px-1.5 font-bold tabular-nums";
                return (
                  <tr key={i} className={cn("border-t border-white/5", l.isBreak && "bg-sky-950/40", current === i && "outline outline-2 -outline-offset-2 outline-amber-400")}>
                    <td className="py-1 pr-1 font-black whitespace-nowrap">{l.isBreak ? <span className="text-sky-300">휴식</span> : number}</td>
                    {l.isBreak ? (
                      <td colSpan={3} className="px-1 text-xs text-sky-200">
                        휴식 시간
                      </td>
                    ) : (
                      (["sb", "bb", "ante"] as const).map((key) => (
                        <td key={key} className="px-1">
                          <input aria-label={`${number}레벨 ${key}`} inputMode="numeric" value={won(l[key])} onChange={(e) => setLevel(i, { [key]: Math.min(BOARD_LIMITS.chips, readNum(e.target.value)) })} className={cell} />
                        </td>
                      ))
                    )}
                    <td className="w-16 px-1">
                      <input aria-label={`${i + 1}번째 칸 분`} inputMode="numeric" value={l.minutes} onChange={(e) => setLevel(i, { minutes: Math.min(BOARD_LIMITS.minutes, Math.max(1, readNum(e.target.value))) })} className={cell} />
                    </td>
                    <td className="px-1 whitespace-nowrap">
                      <button type="button" onClick={() => onJump(i)} className="rounded-md border border-amber-400/50 px-2 py-1 text-xs font-bold text-amber-200">
                        지금 여기
                      </button>{" "}
                      <button
                        type="button"
                        aria-label="칸 지우기"
                        disabled={data.levels.length <= 1}
                        onClick={() => onEdit({ levels: data.levels.filter((_, j) => j !== i) })}
                        className="rounded-md border border-rose-400/40 px-2 py-1 text-xs font-bold text-rose-200 disabled:opacity-30"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={data.levels.length >= BOARD_LIMITS.levels}
            onClick={() => {
              const bb = Math.round((lastBb * 1.5) / 100) * 100 || 200;
              onEdit({ levels: [...data.levels, { sb: Math.max(100, Math.round(bb / 2 / 100) * 100), bb, ante: bb, minutes: data.levels.find((l) => !l.isBreak)?.minutes ?? 20 }] });
            }}
            className="min-h-11 rounded-xl border border-white/20 px-4 text-sm font-black text-white disabled:opacity-40"
          >
            + 레벨 추가
          </button>
          <button
            type="button"
            disabled={data.levels.length >= BOARD_LIMITS.levels}
            onClick={() => onEdit({ levels: [...data.levels, { sb: 0, bb: 0, ante: 0, minutes: 10, isBreak: true }] })}
            className="min-h-11 rounded-xl border border-sky-400/50 px-4 text-sm font-black text-sky-200 disabled:opacity-40"
          >
            + 휴식 추가
          </button>
        </div>
      </section>
    </div>
  );
}

/* ───────────── 프라이즈: 순위 · 금액 · 색 ───────────── */

function PrizeForm({ data, onEdit }: { data: GameBoardData; onEdit: (c: Partial<GameBoardData>) => void }) {
  const rows = data.prizes;
  const set = (next: PrizeRow[]) => onEdit({ prizes: next });
  const change = (i: number, c: Partial<PrizeRow>) => set(rows.map((r, j) => (j === i ? { ...r, ...c } : r)));
  const up = (i: number) => {
    if (i <= 0) return;
    const next = [...rows];
    [next[i - 1], next[i]] = [next[i], next[i - 1]];
    set(next);
  };
  const field = "h-11 w-full min-w-0 rounded-lg border border-white/20 bg-black px-2 text-base font-black";
  return (
    <section data-prize-form className="ink-panel grid gap-3 rounded-2xl p-3 sm:p-4">
      <h2 className="text-base font-black text-white">프라이즈</h2>
      <p className="text-sm text-[#D1D5DB]">TV 화면 오른쪽에 나옵니다. 순위마다 글씨 색을 고를 수 있어요(1위 금 · 2위 은 · 3위 동이 기본).</p>
      <label className="grid min-w-0 gap-1 text-xs font-bold text-zinc-300">
        위 문구(예: GTD 1,000만 · 총 상금 1,200만)
        <input value={data.prizeTitle} maxLength={BOARD_LIMITS.prizeTitle} onChange={(e) => onEdit({ prizeTitle: e.target.value })} className={cn(field, "text-amber-200")} />
      </label>
      <ol className="grid gap-2">
        {rows.map((row, i) => (
          <li key={i} data-prize-edit={i} className="grid gap-2 rounded-xl border border-white/10 bg-black/50 p-2">
            <div className="grid grid-cols-[minmax(0,5rem)_minmax(0,1fr)_auto] gap-2">
              <input aria-label={`${i + 1}번째 순위`} value={row.place} maxLength={BOARD_LIMITS.prizeText} onChange={(e) => change(i, { place: e.target.value })} placeholder={`${i + 1}위`} style={{ color: PRIZE_COLORS[row.color].hex }} className={field} />
              <input aria-label={`${i + 1}번째 금액`} value={row.amount} maxLength={BOARD_LIMITS.prizeText} onChange={(e) => change(i, { amount: e.target.value })} placeholder="300만" style={{ color: PRIZE_COLORS[row.color].hex }} className={cn(field, "tabular-nums")} />
              <div className="flex gap-1">
                <button type="button" aria-label="위로" onClick={() => up(i)} disabled={i === 0} className="size-11 rounded-lg border border-white/15 text-sm disabled:opacity-30">
                  ▲
                </button>
                <button type="button" aria-label="줄 지우기" onClick={() => set(rows.filter((_, j) => j !== i))} className="size-11 rounded-lg border border-rose-400/40 text-sm text-rose-200">
                  ✕
                </button>
              </div>
            </div>
            <div role="radiogroup" aria-label={`${i + 1}번째 색`} className="flex flex-wrap gap-1.5">
              {(Object.keys(PRIZE_COLORS) as PrizeColor[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  role="radio"
                  aria-checked={row.color === key}
                  aria-label={PRIZE_COLORS[key].label}
                  title={PRIZE_COLORS[key].label}
                  onClick={() => change(i, { color: key })}
                  style={{ background: PRIZE_COLORS[key].hex }}
                  className={cn("size-8 rounded-full border-2", row.color === key ? "border-white ring-2 ring-amber-400" : "border-black/40")}
                />
              ))}
            </div>
          </li>
        ))}
      </ol>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={rows.length >= BOARD_LIMITS.prizes}
          onClick={() => set([...rows, { place: `${rows.length + 1}위`, amount: "", color: defaultPrizeColor(rows.length) }])}
          className="min-h-11 rounded-xl bg-amber-400 px-4 text-sm font-black text-black disabled:opacity-40"
        >
          + 순위 추가
        </button>
        {rows.length ? (
          <button type="button" onClick={() => window.confirm("프라이즈를 모두 지울까요?") && set([])} className="min-h-11 rounded-xl border border-white/15 px-4 text-sm font-bold text-zinc-300">
            모두 지우기
          </button>
        ) : null}
      </div>
    </section>
  );
}

/* ───────────── 미리보기: TV 화면(1280×720)을 그대로 줄여 보여 줌 ───────────── */

function ScaledPreview({ data, now }: { data: GameBoardData; now: number }) {
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setScale(el.clientWidth / 1280));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={box} data-board-preview className="relative aspect-video w-full overflow-hidden rounded-2xl border-2 border-[#c9a25c]/50 bg-black">
      <div style={{ width: 1280, height: 720, transform: `scale(${scale})`, transformOrigin: "top left" }} className={cn("absolute top-0 left-0", !scale && "invisible")}>
        <GameBoardScreen data={data} now={now} />
      </div>
    </div>
  );
}

/* ───────────── 배경 사진: 올리기 · 어둡기 · 지우기 ───────────── */

function BackgroundForm({ data, onEdit }: { data: GameBoardData; onEdit: (c: Partial<GameBoardData>) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  async function pick(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setNote(null);
    try {
      if (!file.type.startsWith("image/")) throw new Error("사진 파일을 골라 주세요.");
      const form = new FormData();
      form.append("file", await shrinkPhoto(file, 1920));
      const res = await fetch("/api/uploads/image", { method: "POST", body: form });
      const json = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok || !json.url) throw new Error(json.error ?? "사진을 올리지 못했습니다.");
      onEdit({ bgUrl: json.url });
    } catch (e) {
      setNote((e as Error).message);
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }
  return (
    <section data-bg-form className="ink-panel grid gap-3 rounded-2xl p-3 sm:p-4">
      <h2 className="text-base font-black text-white">배경 사진</h2>
      <p className="text-sm text-[#D1D5DB]">매장 사진 · 대회 포스터를 올리면 TV 화면 뒤에 깔려요. 글씨가 잘 보이게 어둡게 덮을 수 있어요.</p>
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative aspect-video w-40 shrink-0 overflow-hidden rounded-lg border border-white/20 bg-black">
          {data.bgUrl ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element -- 올린 배경 미리보기 */}
              <img src={data.bgUrl} alt="배경 사진" className="absolute inset-0 size-full object-cover" />
              <div className="absolute inset-0 bg-black" style={{ opacity: data.bgDim / 100 }} />
            </>
          ) : (
            <span className="absolute inset-0 grid place-items-center text-xs font-bold text-zinc-500">기본 배경</span>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" aria-label="배경 사진 파일" className="hidden" onChange={(e) => void pick(e.target.files?.[0])} />
          <button type="button" disabled={busy} onClick={() => fileRef.current?.click()} className="min-h-11 rounded-xl bg-amber-400 px-4 text-sm font-black text-black disabled:opacity-50">
            {busy ? "올리는 중…" : data.bgUrl ? "사진 바꾸기" : "사진 올리기"}
          </button>
          {data.bgUrl ? (
            <button type="button" onClick={() => onEdit({ bgUrl: "" })} className="min-h-11 rounded-xl border border-white/20 px-4 text-sm font-bold text-zinc-200">
              기본 배경으로
            </button>
          ) : null}
        </div>
      </div>
      {data.bgUrl ? (
        <label className="grid gap-1 text-xs font-bold text-zinc-300">
          어둡게 {data.bgDim}%
          <input type="range" min={0} max={90} step={5} value={data.bgDim} aria-label="배경 어둡게" onChange={(e) => onEdit({ bgDim: Number(e.target.value) })} className="accent-amber-400" />
        </label>
      ) : null}
      {note ? <p className="text-sm font-bold text-rose-300">{note}</p> : null}
    </section>
  );
}
