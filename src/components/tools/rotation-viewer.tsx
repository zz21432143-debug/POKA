"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { cn } from "cn";
import { closedFromOf, formatWorkDate, kstClock, nowMinutes, type RotationShareView } from "@/lib/rotation";
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

/** 시간표에서 보여 줄 칸 수(지금 칸부터) */
const COLS = 8;

function untilLabel(minutes: number) {
  if (minutes <= 0) return "지금";
  if (minutes < 60) return `${minutes}분 후`;
  return `${Math.floor(minutes / 60)}시간 ${minutes % 60}분 후`;
}

/**
 * 보기 전용 교대표: 다음 교대, 내 일정(이름 고르기), 시간표.
 * TV 화면 모드는 화면 전체를 쓰고 글씨를 크게 합니다. 고칠 수는 없습니다.
 */
export function RotationViewer({ token, initial, tv: tvInitial }: { token: string; initial: RotationShareView; tv: boolean }) {
  const [state, setState] = useState(initial);
  const [clock, setClock] = useState(() => new Date());
  const [closed, setClosed] = useState(false);
  const [tv, setTv] = useState(tvInitial);
  const [me, setMe] = useState("");
  const versionRef = useRef(initial.version);
  const meKey = `poka-rotation-me-${token}`;
  const inBrowser = useInBrowser();

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
  const cols = plan ? plan.slots.map((slot, index) => ({ slot, index })).slice(Math.max(0, current), Math.max(0, current) + COLS) : [];
  const meId = state.dealers.find((d) => d.name === me)?.id ?? null;
  const mySchedule = plan && meId
    ? cols.map(({ slot, index }) => {
        const t = slot.seats.indexOf(meId);
        return { at: slot.at, index, where: t >= 0 ? `T${labels[t]}` : slot.rest.includes(meId) ? "휴식" : "—" };
      })
    : [];

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
    <div className={cn("grid gap-3 text-white", tv ? "fixed inset-0 z-[9999] content-start overflow-auto bg-black p-4" : "pb-10")}>
      <header className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/15 bg-zinc-950 p-3">
        {/* eslint-disable-next-line @next/next/no-img-element -- 작은 로고 한 장 */}
        <img src="/brand/poka-holdem-logo.jpg" alt="POKA" className={cn("rounded-lg", tv ? "size-20" : "size-12")} />
        <div className="grid min-w-0">
          <span className="text-xs font-bold text-zinc-400">교대표 · 보기 전용</span>
          <span className={cn("truncate font-black text-amber-300", tv ? "text-5xl" : "text-2xl")}>{state.game.name}</span>
          <span className={cn("font-bold text-zinc-300", tv ? "text-xl" : "text-sm")}>{formatWorkDate(state.game.workDate)}</span>
        </div>
        <span className={cn("ml-auto font-black text-amber-300 tabular-nums", tv ? "text-5xl" : "text-2xl")}>{kstClock(clock)}</span>
        <button type="button" onClick={() => void toggleTv()} className="min-h-11 rounded-lg border border-white/30 px-3 text-sm font-black">
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
        <section aria-label="다음 교대" className="grid gap-2 rounded-2xl border-2 border-amber-400 bg-amber-950/30 p-3">
          <div className="flex flex-wrap items-baseline gap-2">
            <span className={cn("font-black text-amber-300", tv ? "text-5xl" : "text-2xl")}>다음 교대 {formatClock(swap.at)}</span>
            <span className={cn("font-bold text-amber-100", tv ? "text-2xl" : "text-sm")}>{untilLabel(swap.at - now)}</span>
            {button ? <span className={cn("ml-auto rounded bg-white px-2 font-black text-black", tv ? "text-2xl" : "text-sm")}>버튼 {button}번</span> : null}
          </div>
          <ul className={cn("grid gap-1.5", tv ? "grid-cols-[repeat(auto-fill,minmax(22rem,1fr))]" : "grid-cols-[repeat(auto-fill,minmax(min(100%,14rem),1fr))]")}>
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
                <span className={cn("font-black text-emerald-300", tv ? "text-3xl" : "text-lg")}>T{row.label}</span>
                <span className={cn("font-black", tv ? "text-3xl" : "text-base")}>
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
            <p className={cn("font-bold text-amber-300", tv ? "text-2xl" : "text-sm")}>휴식 들어감 {swap.toRest.map(name).join(", ")}</p>
          ) : null}
        </section>
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
          </label>
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
          <table className="border-collapse">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 bg-zinc-900 px-2 py-2 text-left text-sm font-black text-zinc-300">테이블</th>
                {cols.map(({ slot, index }) => (
                  <th
                    key={slot.at}
                    className={cn(
                      "px-2 py-1.5 font-black",
                      tv ? "text-3xl" : "text-lg",
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
                  <th className={cn("sticky left-0 z-10 bg-zinc-900 px-2 py-1 text-left font-black text-emerald-300", tv ? "text-3xl" : "text-lg")}>T{label}</th>
                  {cols.map(({ slot, index }) => {
                    const id = slot.seats[t];
                    const shut = closedFrom[t] != null && slot.at >= (closedFrom[t] as number);
                    return (
                      <td key={slot.at} className={cn("px-1 py-1", index === current && "bg-emerald-950")}>
                        <span
                          className={cn(
                            "grid min-w-[5rem] place-items-center rounded-lg px-1.5 py-1.5 font-black",
                            tv ? "text-2xl" : "text-base",
                            shut ? "border border-rose-500 bg-rose-950 text-rose-300" : id && id === meId ? "bg-sky-500 text-black" : "bg-zinc-800",
                          )}
                        >
                          {shut ? "컨바인" : name(id) || "—"}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
              <tr className="border-t-2 border-amber-400/40">
                <th className="sticky left-0 z-10 bg-zinc-900 px-2 py-1.5 text-left text-base font-black text-amber-300">휴식</th>
                {cols.map(({ slot }) => (
                  <td key={slot.at} className={cn("max-w-[9rem] px-1.5 py-1.5 align-top font-bold text-amber-200", tv ? "text-lg" : "text-xs")}>
                    {slot.rest.map(name).join(", ") || "—"}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </section>
      ) : null}

      <p className="text-center text-xs text-zinc-500">ⓒ POKA 홀덤 커뮤니티 · pokerwiki.co.kr · 15초마다 자동으로 새로 고칩니다</p>
    </div>
  );
  // TV 화면: 사이트 메뉴(위 고정 막대)보다 위에 오도록 페이지 맨 바깥(body)에 그립니다.
  return tv && inBrowser ? createPortal(content, document.body) : content;
}
