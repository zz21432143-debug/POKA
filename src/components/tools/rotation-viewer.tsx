"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Link from "@/components/ui/link";
import { createPortal } from "react-dom";
import { cn } from "cn";
import { closedFromOf, formatWorkDate, kstClock, nowMinutes, openedFromOf, tableTag, type RotationShareView } from "@/lib/rotation";
import { formatClock, parseClock, slotIndexAt, tableOpenAt } from "@/lib/rotation-plan";
import { swapInfo } from "@/components/tools/rotation-export";
import { RotationTvScreen, type TvTheme } from "@/components/tools/rotation-tv";

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
  theme = "dark",
}: {
  token: string;
  initial: RotationShareView;
  tv: boolean;
  /** TV 쪽 넘김 간격(초, 테이블이 40개 넘을 때) */
  pageSeconds?: number;
  /** TV 화면 색: 어두운 · 밝은(조명이 밝은 매장) */
  theme?: TvTheme;
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
  const openedFrom = useMemo(() => openedFromOf(labels, state.tableState), [labels, state.tableState]);
  const swap = plan ? swapInfo(plan, labels, current, next, closedFrom, openedFrom) : null;
  const nowAt = plan ? (plan.slots[Math.max(0, current)]?.at ?? now) : now;
  const cols = plan ? plan.slots.map((slot, index) => ({ slot, index })).slice(Math.max(0, current), Math.max(0, current) + (narrow ? COLS_NARROW : COLS)) : [];
  const interval = plan?.interval ?? state.interval;
  // 보이는 칸 안에 열리지 않는 테이블(스탠바이)은 빼고, 컨바인 끝난 테이블도 뺌
  const lastAt = cols.length ? cols[cols.length - 1].slot.at : nowAt;
  const openTables = labels
    .map((label, t) => ({ label, t }))
    .filter(({ t }) => (closedFrom[t] == null || (closedFrom[t] as number) > nowAt) && tableOpenAt(t, lastAt, interval, [], openedFrom));
  /** 칸 중간에 여는 테이블: 그 칸에 딜러가 앉는 시각(예: 13:10) */
  const opensIn = (t: number, at: number) => {
    const o = openedFrom[t];
    return o != null && o > at && o < at + interval ? o : null;
  };
  const meId = state.dealers.find((d) => d.name === me)?.id ?? null;
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
    <div className="poka-watermark grid gap-3 pb-10 text-white">
      <header className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/15 bg-zinc-950 p-3">
        {/* eslint-disable-next-line @next/next/no-img-element -- 작은 로고 한 장 */}
        <img src="/brand/poka-oni-mark.png" alt="POKA" className="h-auto w-12 shrink-0" />
        <div className="grid min-w-0">
          <span className="text-xs font-bold text-zinc-400">교대표 · 보기 전용</span>
          <span className="truncate text-2xl leading-tight font-black text-amber-300">
            {state.game.name}
          </span>
          <span className="text-sm font-bold text-zinc-300">
            {formatWorkDate(state.game.workDate)}
          </span>
        </div>
        <span className="ml-auto text-2xl font-black text-amber-300 tabular-nums">
          {kstClock(clock)}
        </span>
        <button type="button" onClick={() => void toggleTv()} className="min-h-11 rounded-lg border border-white/30 px-3 text-sm font-black">
          TV 화면
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
        <section aria-label="다음 교대" className="grid gap-2 rounded-2xl border-2 border-amber-400 bg-amber-950/30 p-3">
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="text-2xl font-black text-amber-300">
              다음 교대 {formatClock(swap.at)}
            </span>
            <span className="text-sm font-bold text-amber-100">
              {untilLabel(swap.at - now)}
            </span>
            {button ? (
              <span className="ml-auto rounded bg-white px-2 text-sm font-black text-black">
                버튼 {button}번
              </span>
            ) : null}
          </div>
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,14rem),1fr))] gap-1.5">
            {swap.rows.map((row) => (
              <li
                key={row.label}
                data-swap={row.label}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-2.5 py-1.5",
                  row.closed ? "border border-rose-500 bg-rose-950" : "bg-black",
                  meId && (row.from === meId || row.to === meId) && "ring-2 ring-sky-400",
                )}
              >
                <span className="shrink-0 text-lg font-black text-emerald-300">{tableTag(row.label)}</span>
                <span className="min-w-0 truncate text-base font-black">
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
            <p className="text-sm font-bold text-amber-300">
              휴식 들어감 {swap.toRest.map(name).join(", ")}</p>
          ) : null}
        </section>
      ) : null}

      {/* 교대 5분 전 알림 배너 */}
      {alertNow ? (
        <p role="alert" data-alert className="animate-pulse rounded-2xl border-2 border-sky-400 bg-sky-950 px-3 py-2 text-lg font-black text-sky-100">
          🔔 {me} · {alertText}
        </p>
      ) : null}

      {/* 내 일정 */}
      {plan ? (
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
        <section aria-label="시간표" className="overflow-auto rounded-xl border border-white/15">
          <table className="w-full table-fixed border-collapse">
            <colgroup>
              <col className="w-14 sm:w-20" />
            </colgroup>
            <thead>
              <tr>
                <th className="sticky left-0 z-10 bg-zinc-900 px-2 py-2 text-left text-xs font-black whitespace-nowrap text-zinc-300 sm:text-sm">테이블</th>
                {cols.map(({ slot, index }) => (
                  <th
                    key={slot.at}
                    className={cn(
                      "px-1 py-1.5 text-sm font-black tabular-nums sm:text-lg",
                      index === current ? "bg-emerald-700" : index === next ? "bg-amber-500 text-black" : "bg-zinc-900",
                    )}
                  >
                    {formatClock(slot.at)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {openTables.map(({ label, t }) => (
                <tr key={label} className="border-t border-white/10">
                  <th className="sticky left-0 z-10 bg-zinc-900 px-2 py-1 text-left text-base font-black text-emerald-300 sm:text-lg">{tableTag(label)}</th>
                  {cols.map(({ slot, index }) => {
                    const id = slot.seats[t];
                    const shut = closedFrom[t] != null && slot.at >= (closedFrom[t] as number);
                    const standby = !tableOpenAt(t, slot.at, interval, [], openedFrom);
                    const opens = opensIn(t, slot.at);
                    return (
                      <td key={slot.at} className={cn("px-0.5 py-0.5 sm:p-1", index === current && "bg-emerald-950")}>
                        <span
                          className={cn(
                            "grid place-items-center truncate rounded-lg px-1 py-1.5 text-sm font-black sm:text-base",
                            shut
                              ? "border border-rose-500 bg-rose-950 text-rose-300"
                              : standby
                                ? "border border-dashed border-white/15 bg-zinc-900 text-xs text-zinc-500"
                                : id && id === meId
                                  ? "bg-sky-500 text-black"
                                  : "bg-zinc-800",
                          )}
                        >
                          {shut ? "컨바인" : standby ? "오픈 전" : name(id) || "—"}
                          {!shut && !standby && opens != null ? <span className="text-[10px] text-emerald-300">{formatClock(opens)}~</span> : null}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
              <tr className="border-t-2 border-amber-400/40">
                <th className="sticky left-0 z-10 bg-zinc-900 px-2 py-1.5 text-left text-sm font-black text-amber-300 sm:text-base">휴식</th>
                {cols.map(({ slot }) => (
                  <td key={slot.at} className="px-1 py-1.5 align-top text-xs font-bold break-keep text-amber-200">
                    {slot.rest.map(name).join(", ") || "—"}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </section>
      ) : null}

      {/* 교대표 QR을 찍고 들어온 딜러에게 POKA 홍보 */}
      <Link href="/boards/jobs?from=rotation" data-viewer-promo className="flex min-h-14 items-center gap-3 rounded-2xl border border-[#c9a25c]/40 bg-[#c9a25c]/10 px-4 py-3">
        <span aria-hidden className="text-2xl">🔔</span>
        <span className="grid min-w-0 gap-0.5">
          <b className="text-sm font-black text-[#f3d9a4]">딜러 급구 · 대타 공고, 휴대폰 알림으로 받기</b>
          <span className="text-xs text-zinc-300">POKA 홀덤 커뮤니티 · 구인구직 · 무료 홀덤 도구</span>
        </span>
        <span className="ml-auto shrink-0 text-xs font-black text-[#e7c98a]">둘러보기 ›</span>
      </Link>

      <p className="text-center text-xs text-zinc-500">ⓒ POKA 홀덤 커뮤니티 · pokerwiki.co.kr · 15초마다 자동으로 새로 고칩니다</p>
    </div>
  );
  if (tv) {
    // TV 화면: 지금 · 교대 두 칸만 크게, 스크롤 없이. 사이트 메뉴(위 고정 막대)보다 위에 오도록 페이지 맨 바깥(body)에 그립니다.
    const screen = (
      <RotationTvScreen
        token={token}
        gameName={state.game.name}
        workDate={state.game.workDate}
        clock={clock}
        now={now}
        plan={plan}
        openTables={openTables}
        name={name}
        closedFrom={closedFrom}
        openedFrom={openedFrom}
        current={current}
        next={next}
        swap={swap}
        button={button}
        closed={closed}
        pageSeconds={pageSeconds}
        theme={theme}
        onExit={() => void toggleTv()}
      />
    );
    return inBrowser ? createPortal(screen, document.body) : screen;
  }
  return content;
}
