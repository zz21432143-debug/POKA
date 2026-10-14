"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { cn } from "cn";
import { closedFromOf, formatWorkDate, kstClock, nowMinutes, tableTag, type RotationShareView } from "@/lib/rotation";
import { formatClock, parseClock, slotIndexAt } from "@/lib/rotation-plan";
import { swapInfo } from "@/components/tools/rotation-export";

/** 보기 전용 화면 새로 확인 간격(딜러 폰·TV가 많아도 서버 부담이 적게) */
const POLL_MS = 15_000;
/** 브라우저에서 그리는 중인지(TV 화면은 페이지 맨 바깥에 그려서 사이트 메뉴 위로 올립니다) */
const noop = () => () => {};
function useInBrowser() {
  return useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
}

/** 교대 몇 분 전에 알려 줄지 */
const ALERT_BEFORE = 5;

/** 시간표에서 보여 줄 칸 수(지금 칸부터). 좁은 화면(휴대폰 세로)은 4칸으로 줄여 가로 스크롤 없이 꽉 차게 */
const COLS = 8;
const COLS_NARROW = 4;

/** TV: 한 화면에 보일 테이블 수(넘으면 pageSeconds초마다 쪽 넘김) · 이보다 많으면 좌우 두 칸으로 나눔 */
const TV_PAGE = 30;
const TV_SPLIT = 12;
/** 두 칸으로 나눌 때 칸마다 보일 시간 수 */
const TV_SPLIT_COLS = 4;

/** 화면이 좁은지(가로 640px 미만 또는 세로로 긴 화면) — 바뀌면 다시 그림 */
const NARROW_QUERY = "(max-width: 639px), (orientation: portrait) and (max-width: 900px)";
function useNarrow() {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia(NARROW_QUERY);
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    () => window.matchMedia(NARROW_QUERY).matches,
    () => false,
  );
}

function untilLabel(minutes: number) {
  if (minutes <= 0) return "지금";
  if (minutes < 60) return `${minutes}분 후`;
  return `${Math.floor(minutes / 60)}시간 ${minutes % 60}분 후`;
}

/**
 * 보기 전용 교대표: 다음 교대, 내 일정(이름 고르기), 시간표.
 * TV 화면 모드는 화면 전체를 쓰고 글씨를 크게 합니다. 고칠 수는 없습니다.
 */
export function RotationViewer({
  token,
  initial,
  tv: tvInitial,
  pageSeconds = 10,
}: {
  token: string;
  initial: RotationShareView;
  tv: boolean;
  /** TV 쪽 넘김 간격(초, 테이블이 30개 넘을 때) */
  pageSeconds?: number;
}) {
  const [state, setState] = useState(initial);
  const [clock, setClock] = useState(() => new Date());
  const [closed, setClosed] = useState(false);
  const [tv, setTv] = useState(tvInitial);
  const [me, setMe] = useState("");
  const versionRef = useRef(initial.version);
  const meKey = `poka-rotation-me-${token}`;
  const inBrowser = useInBrowser();
  const narrow = useNarrow();
  /** TV 쪽 넘김(테이블이 30개 넘을 때) */
  const [pageTick, setPageTick] = useState(0);
  // 교대 알림: 켜 두면 내 자리가 바뀌는 교대 5분 전에 진동·알림(이 화면이 열려 있을 때)
  const [alertOn, setAlertOn] = useState(false);
  const alertedRef = useRef("");

  // 내 이름은 이 기기에만 기억(없어도 화면은 그대로)
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(meKey);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- 저장된 값은 화면이 뜬 뒤에만 읽을 수 있습니다.
      if (saved) setMe(saved);
    } catch {
      /* 저장소를 못 쓰면 매번 고르면 됩니다 */
    }
  }, [meKey]);

  useEffect(() => {
    let alive = true;
    const poll = async () => {
      if (document.hidden) return;
      try {
        const response = await fetch(`/api/rotation-view?t=${encodeURIComponent(token)}&v=${versionRef.current}`, { cache: "no-store" });
        if (!alive) return;
        if (response.status === 404) {
          setClosed(true);
          return;
        }
        const data = (await response.json()) as { changed?: boolean; state?: RotationShareView };
        if (data.changed && data.state) {
          versionRef.current = data.state.version;
          setState(data.state);
        }
      } catch {
        /* 다음 확인 때 다시 */
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
  }, [token]);

  const start = parseClock(state.planStart) ?? 600;
  const now = nowMinutes(start, clock);
  const plan = state.plan && state.plan.tables === state.tableLabels.length ? state.plan : null;
  const labels = state.tableLabels;
  const names = useMemo(() => new Map(state.dealers.map((d) => [d.id, d.name])), [state.dealers]);
  const name = (id: string | null) => (id ? (names.get(id) ?? "") : "");
  const closedFrom = useMemo(() => closedFromOf(labels, state.tableState), [labels, state.tableState]);
  const button = state.tableState["0"]?.button ?? null;
  const { current, next } = plan ? slotIndexAt(plan, now) : { current: -1, next: -1 };
  const swap = plan ? swapInfo(plan, labels, current, next, closedFrom) : null;
  const nowAt = plan ? (plan.slots[Math.max(0, current)]?.at ?? now) : now;
  const openTables = labels.map((label, t) => ({ label, t })).filter(({ t }) => closedFrom[t] == null || (closedFrom[t] as number) > nowAt);
  const cols = plan ? plan.slots.map((slot, index) => ({ slot, index })).slice(Math.max(0, current), Math.max(0, current) + (narrow ? COLS_NARROW : COLS)) : [];
  const meId = state.dealers.find((d) => d.name === me)?.id ?? null;
  // TV: 테이블이 많으면(12개 넘게) 좌우 두 칸, 30개 넘으면 쪽을 나눠 10초마다 넘김
  const many = tv && openTables.length > TV_SPLIT;
  const pages: (typeof openTables)[] = [];
  for (let i = 0; i < openTables.length; i += tv ? TV_PAGE : openTables.length || 1) pages.push(openTables.slice(i, i + (tv ? TV_PAGE : openTables.length)));
  if (pages.length === 0) pages.push([]);
  const pageIndex = pageTick % pages.length;
  const pageTables = pages[pageIndex];
  const half = Math.ceil(pageTables.length / 2);
  const blocks = many && !narrow ? [pageTables.slice(0, half), pageTables.slice(half)].filter((b) => b.length) : [pageTables];
  const shownCols = many ? cols.slice(0, narrow ? COLS_NARROW : TV_SPLIT_COLS) : cols;
  // TV: 글씨를 화면 크기(가로 vw · 세로 dvh)에 맞춰 키움 — 테이블이 적으면 크게, 많으면 한 화면에 다 들어가게
  const tvRows = Math.max(...blocks.map((b) => b.length), 1) + 2;
  const fit = (vw: number, dvh: number) => (tv ? { fontSize: `min(${vw.toFixed(2)}vw, ${dvh.toFixed(2)}dvh)` } : undefined);
  const colCount = Math.max(shownCols.length, 1);
  const share = blocks.length;
  const cellFont = fit(24 / (colCount + 1) / share, (many ? 33 : 28) / tvRows);
  const headFont = fit(20 / (colCount + 1) / share, (many ? 24 : 22) / tvRows);
  // 다음 교대: 테이블이 많으면 바뀌는 자리만(유지는 빼고) 촘촘하게
  const swapRows = swap ? (many ? swap.rows.filter((r) => r.closed || r.from !== r.to) : swap.rows) : [];
  const mySchedule = plan && meId
    ? cols.map(({ slot, index }) => {
        const t = slot.seats.indexOf(meId);
        return { at: slot.at, index, where: t >= 0 ? tableTag(labels[t]) : slot.rest.includes(meId) ? "휴식" : "—" };
      })
    : [];

  // 내 다음 교대: 지금 칸 → 다음 칸에서 내 자리가 바뀌면 안내
  const whereAt = (index: number) => {
    const slot = plan?.slots[index];
    if (!slot || !meId) return "—";
    const t = slot.seats.indexOf(meId);
    return t >= 0 ? tableTag(labels[t]) : slot.rest.includes(meId) ? "휴식" : "—";
  };
  const myNow = current >= 0 ? whereAt(current) : "—";
  const myNext = next >= 0 ? whereAt(next) : "—";
  const minutesLeft = plan && next >= 0 ? plan.slots[next].at - now : null;
  const myChange = meId && minutesLeft != null && myNext !== "—" && myNext !== myNow ? { at: plan!.slots[next].at, from: myNow, to: myNext } : null;
  const alertNow = Boolean(myChange && minutesLeft != null && minutesLeft > 0 && minutesLeft <= ALERT_BEFORE);
  const alertText = myChange ? `${minutesLeft}분 후 ${formatClock(myChange.at)} 교대 · ${myChange.to === "휴식" ? "휴식입니다" : `${myChange.to} 들어갑니다`}` : "";

  const changeAt = myChange?.at ?? null;
  useEffect(() => {
    if (!alertOn || !alertNow || changeAt == null) return;
    const key = `${me}-${changeAt}`;
    if (alertedRef.current === key) return;
    alertedRef.current = key;
    try {
      navigator.vibrate?.([300, 150, 300]);
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification("POKA 교대 알림", { body: alertText, icon: "/brand/poka-oni-mark.png", tag: key });
      }
    } catch {
      /* 알림을 못 띄워도 화면 배너는 보입니다 */
    }
  }, [alertOn, alertNow, changeAt, me, alertText]);

  const pageCount = tv ? Math.ceil(openTables.length / TV_PAGE) : 1;
  useEffect(() => {
    if (pageCount <= 1) return;
    const timer = window.setInterval(() => setPageTick((n) => n + 1), pageSeconds * 1000);
    return () => window.clearInterval(timer);
  }, [pageCount, pageSeconds]);

  async function turnOnAlert() {
    try {
      if ("Notification" in window && Notification.permission === "default") await Notification.requestPermission();
    } catch {
      /* 권한을 못 받아도 화면 배너·진동은 됩니다 */
    }
    setAlertOn(true);
  }

  function chooseMe(value: string) {
    setMe(value);
    try {
      window.localStorage.setItem(meKey, value);
    } catch {
      /* 무시 */
    }
  }

  async function toggleTv() {
    const nextTv = !tv;
    setTv(nextTv);
    try {
      if (nextTv && !document.fullscreenElement) await document.documentElement.requestFullscreen();
      if (!nextTv && document.fullscreenElement) await document.exitFullscreen();
    } catch {
      /* 전체 화면을 못 써도 TV 배치는 그대로 */
    }
  }

  const content = (
    // TV: 화면 전체를 덮음. 워터마크 스타일(position: relative)이 fixed를 덮어써 TV 화면이 페이지 맨 아래로 밀려 사라지던 문제 — 직접 고정
    <div
      data-rotation-tv={tv ? "on" : undefined}
      className={cn("poka-watermark text-white", tv ? "inset-0 z-[9999] flex flex-col gap-[1.2dvh] overflow-auto bg-black p-[1.2dvh]" : "grid gap-3 pb-10")}
      style={tv ? { position: "fixed" } : undefined}
    >
      <header className={cn("flex flex-wrap items-center gap-3 rounded-2xl border border-white/15 bg-zinc-950", tv ? "shrink-0 px-[1.5vw] py-[1dvh]" : "p-3")}>
        {/* eslint-disable-next-line @next/next/no-img-element -- 작은 로고 한 장 */}
        <img src="/brand/poka-oni-mark.png" alt="POKA" className={cn("h-auto shrink-0", tv ? "w-[min(6vw,9dvh)]" : "w-12")} />
        <div className="grid min-w-0">
          <span className={cn("text-xs font-bold text-zinc-400", tv && "[@media(max-height:560px)]:hidden")}>교대표 · 보기 전용</span>
          <span className={cn("truncate font-black leading-tight text-amber-300", !tv && "text-2xl")} style={tv ? { fontSize: "min(3.6vw, 6dvh)" } : undefined}>
            {state.game.name}
          </span>
          <span className={cn("font-bold text-zinc-300", !tv && "text-sm")} style={tv ? { fontSize: "min(1.6vw, 2.8dvh)" } : undefined}>
            {formatWorkDate(state.game.workDate)}
          </span>
        </div>
        <span className={cn("ml-auto font-black text-amber-300 tabular-nums", !tv && "text-2xl")} style={tv ? { fontSize: "min(4vw, 7dvh)" } : undefined}>
          {kstClock(clock)}
        </span>
        <button type="button" onClick={() => void toggleTv()} className={cn("rounded-lg border border-white/30 font-black", tv ? "min-h-9 px-2 text-xs" : "min-h-11 px-3 text-sm")}>
          {tv ? "TV 화면 끄기" : "TV 화면"}
        </button>
      </header>

      {closed ? (
        <p className="rounded-xl bg-rose-950 px-3 py-2 text-sm font-bold text-rose-200">공유가 꺼졌습니다. 담당자에게 새 링크를 받아 주세요.</p>
      ) : null}

      {!plan ? (
        <p className="rounded-xl border border-dashed border-white/25 p-4 text-sm text-zinc-300">아직 시간표가 없습니다. 잠시 후 다시 확인해 주세요.</p>
      ) : null}

      {/* 다음 교대 */}
      {plan && swap ? (
        <section aria-label="다음 교대" className={cn("grid gap-2 rounded-2xl border-2 border-amber-400 bg-amber-950/30", tv ? "shrink-0 px-[1.5vw] py-[1.2dvh]" : "p-3")}>
          <div className="flex flex-wrap items-baseline gap-2">
            <span className={cn("font-black text-amber-300", !tv && "text-2xl")} style={tv ? { fontSize: many ? "min(2.4vw, 4dvh)" : "min(3.4vw, 6dvh)" } : undefined}>
              다음 교대 {formatClock(swap.at)}
            </span>
            <span className={cn("font-bold text-amber-100", !tv && "text-sm")} style={tv ? { fontSize: "min(1.8vw, 3.2dvh)" } : undefined}>
              {untilLabel(swap.at - now)}
            </span>
            {button ? (
              <span className={cn("ml-auto rounded bg-white px-2 font-black text-black", !tv && "text-sm")} style={tv ? { fontSize: "min(1.8vw, 3.2dvh)" } : undefined}>
                버튼 {button}번
              </span>
            ) : null}
          </div>
          {many ? (
            <p data-tv-swap-hint className="font-bold text-amber-100" style={{ fontSize: "min(1.3vw, 2.4dvh)" }}>
              테이블이 많아 자리별 교대는 아래 표의 <b className="rounded bg-amber-500 px-1 text-black">주황 칸</b>(다음 교대)에서 보세요
            </p>
          ) : null}
          <ul
            hidden={many}
            className={cn("grid gap-1.5", !tv && "grid-cols-[repeat(auto-fill,minmax(min(100%,14rem),1fr))]")}
            style={
              tv
                ? many
                  ? { gridTemplateColumns: `repeat(${Math.min(swapRows.length, 6) || 1}, minmax(0, 1fr))`, fontSize: "min(1.25vw, 2.3dvh)" }
                  : { gridTemplateColumns: `repeat(${Math.min(swapRows.length, 5) || 1}, minmax(0, 1fr))`, fontSize: "min(1.9vw, 3.6dvh)" }
                : undefined
            }
          >
            {swapRows.map((row) => (
              <li
                key={row.label}
                data-swap={row.label}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-2.5",
                  many ? "py-0.5" : "py-1.5",
                  row.closed ? "border border-rose-500 bg-rose-950" : "bg-black",
                  meId && (row.from === meId || row.to === meId) && "ring-2 ring-sky-400",
                )}
              >
                <span className={cn("shrink-0 font-black text-emerald-300", !tv && "text-lg")}>{tableTag(row.label)}</span>
                <span className={cn("min-w-0 truncate font-black", !tv && "text-base")}>
                  {row.closed ? (
                    <span className="text-rose-300">{row.from ? `${name(row.from)} → ` : ""}컨바인</span>
                  ) : row.from && row.from === row.to ? (
                    <>
                      {name(row.to)} <span className="text-xs text-zinc-400">유지</span>
                    </>
                  ) : (
                    <>
                      <span className="text-zinc-400">{name(row.from) || "—"}</span> <span className="text-amber-300">→</span>{" "}
                      <span className={row.to ? "text-white" : "text-rose-300"}>{name(row.to) || "비어 있음"}</span>
                    </>
                  )}
                </span>
              </li>
            ))}
          </ul>
          {swap.toRest.length ? (
            <p className={cn("font-bold text-amber-300", !tv && "text-sm", many && "truncate")} style={tv ? { fontSize: many ? "min(1.2vw, 2.2dvh)" : "min(1.7vw, 3dvh)" } : undefined}>
              휴식 들어감 {swap.toRest.map(name).join(", ")}</p>
          ) : null}
        </section>
      ) : null}

      {/* 교대 5분 전 알림 배너 */}
      {alertNow ? (
        <p role="alert" data-alert className={cn("animate-pulse rounded-2xl border-2 border-sky-400 bg-sky-950 px-3 py-2 font-black text-sky-100", tv ? "text-3xl" : "text-lg")}>
          🔔 {me} · {alertText}
        </p>
      ) : null}

      {/* 내 일정 */}
      {plan && !tv ? (
        <section aria-label="내 일정" className="grid gap-2 rounded-2xl border border-sky-500/50 bg-sky-950/30 p-3">
          <label className="flex flex-wrap items-center gap-2 text-sm font-bold">
            내 이름
            <select value={me} onChange={(e) => chooseMe(e.target.value)} className="h-11 min-w-0 rounded-lg border border-white/25 bg-black px-2 text-base font-bold">
              <option value="">고르기</option>
              {state.dealers.map((d) => (
                <option key={d.id} value={d.name}>
                  {d.name}
                </option>
              ))}
            </select>
            {me ? (
              <button
                type="button"
                onClick={() => (alertOn ? setAlertOn(false) : void turnOnAlert())}
                className={cn("min-h-11 rounded-lg px-3 text-sm font-black", alertOn ? "bg-sky-500 text-black" : "border border-sky-400/60 text-sky-200")}
              >
                {alertOn ? "🔔 교대 알림 켜짐" : "🔔 교대 5분 전 알림 켜기"}
              </button>
            ) : null}
          </label>
          {me && alertOn ? <p className="text-xs text-zinc-400">이 화면을 열어 둔 동안 내 자리가 바뀌는 교대 5분 전에 진동·알림이 옵니다.</p> : null}
          {mySchedule.length ? (
            <ul className="flex flex-wrap gap-1.5">
              {mySchedule.map((row) => (
                <li
                  key={row.at}
                  className={cn(
                    "rounded-lg px-2.5 py-1.5 text-base font-black",
                    row.where === "휴식" ? "bg-amber-400 text-black" : row.where === "—" ? "bg-zinc-900 text-zinc-500" : "bg-emerald-600 text-white",
                    row.index === current && "ring-2 ring-white",
                  )}
                >
                  {formatClock(row.at)} {row.where}
                </li>
              ))}
            </ul>
          ) : me ? (
            <p className="text-sm text-zinc-400">시간표에 아직 없습니다.</p>
          ) : (
            <p className="text-sm text-zinc-400">이름을 고르면 내 다음 테이블과 휴식 시간이 보입니다.</p>
          )}
        </section>
      ) : null}

      {/* 시간표 */}
      {plan ? (
        <section aria-label="시간표" data-tv-blocks={blocks.length} className={cn("grid gap-1", tv && "min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)]")}>
          {/* 30개 넘으면 쪽 표시(10초마다 넘어감) */}
          {pages.length > 1 ? (
            <p data-tv-page className="text-right font-black text-amber-300" style={{ fontSize: "min(1.4vw, 2.4dvh)" }}>
              테이블 {pageIndex + 1}/{pages.length}쪽 · {pageSeconds}초마다 넘어가요
            </p>
          ) : (
            <span />
          )}
          <div className={cn("grid min-h-0 gap-[1vw]", blocks.length > 1 && "grid-cols-2")}>
            {blocks.map((block, bi) => (
              <div key={bi} className={cn("overflow-auto rounded-xl border border-white/15", tv && "min-h-0")}>
                <table className={cn("w-full table-fixed border-collapse", tv && "h-full")}>
                  <colgroup>
                    <col className={tv ? (blocks.length > 1 ? "w-[14%]" : "w-[8%]") : "w-14 sm:w-20"} />
                  </colgroup>
                  <thead>
                    <tr>
                      <th
                        className={cn("sticky left-0 z-10 bg-zinc-900 px-2 py-1 text-left font-black whitespace-nowrap text-zinc-300", !tv && "text-xs sm:text-sm")}
                        style={tv ? fit(10 / (colCount + 1) / share, 16 / tvRows) : undefined}
                      >
                        테이블
                      </th>
                      {shownCols.map(({ slot, index }) => (
                        <th
                          key={slot.at}
                          style={headFont}
                          className={cn(
                            "px-1 py-1 font-black tabular-nums",
                            !tv && "text-sm sm:text-lg",
                            index === current ? "bg-emerald-700" : index === next ? "bg-amber-500 text-black" : "bg-zinc-900",
                          )}
                        >
                          {formatClock(slot.at)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {block.map(({ label, t }) => (
                      <tr key={label} data-tv-row={label} className="border-t border-white/10">
                        <th className={cn("sticky left-0 z-10 bg-zinc-900 px-2 py-0.5 text-left font-black text-emerald-300", !tv && "text-base sm:text-lg")} style={cellFont}>
                          {tableTag(label)}
                        </th>
                        {shownCols.map(({ slot, index }) => {
                          const id = slot.seats[t];
                          const shut = closedFrom[t] != null && slot.at >= (closedFrom[t] as number);
                          return (
                            <td key={slot.at} className={cn("px-0.5 py-0.5 sm:px-1", !tv && "sm:py-1", tv && "h-px", index === current && "bg-emerald-950")}>
                              <span
                                className={cn(
                                  "grid place-items-center truncate rounded-lg px-1 font-black",
                                  tv ? (many ? "py-[0.15dvh]" : "py-[0.4dvh]") : "py-1.5",
                                  tv ? "h-full" : "text-sm sm:text-base",
                                  shut ? "border border-rose-500 bg-rose-950 text-rose-300" : id && id === meId ? "bg-sky-500 text-black" : "bg-zinc-800",
                                )}
                                style={cellFont}
                              >
                                {shut ? "컨바인" : name(id) || "—"}
                              </span>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                    {/* 휴식 줄: 마지막 칸에만 · 낮은 화면(휴대폰 가로) TV에서는 숨김 — 위 「휴식 들어감」에 보임 */}
                    {bi === blocks.length - 1 ? (
                      <tr className={cn("border-t-2 border-amber-400/40", tv && "[@media(max-height:560px)]:hidden")}>
                        <th className={cn("sticky left-0 z-10 bg-zinc-900 px-2 py-1 text-left font-black text-amber-300", !tv && "text-sm sm:text-base")} style={headFont}>
                          휴식
                        </th>
                        {shownCols.map(({ slot }) => (
                          <td
                            key={slot.at}
                            className={cn("px-1 py-1 align-top font-bold break-keep text-amber-200", !tv && "text-xs")}
                            style={tv ? fit(14 / (colCount + 1) / share, (many ? 15 : 18) / tvRows) : undefined}
                          >
                            {slot.rest.map(name).join(", ") || "—"}
                          </td>
                        ))}
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <p className={cn("text-center text-xs text-zinc-500", tv && "shrink-0 [@media(max-height:560px)]:hidden")}>ⓒ POKA 홀덤 커뮤니티 · pokerwiki.co.kr · 15초마다 자동으로 새로 고칩니다</p>
    </div>
  );
  // TV 화면: 사이트 메뉴(위 고정 막대)보다 위에 오도록 페이지 맨 바깥(body)에 그립니다.
  return tv && inBrowser ? createPortal(content, document.body) : content;
}
