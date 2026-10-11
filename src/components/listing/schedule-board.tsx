"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeftIcon, ChevronRightIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScheduleCalendar, sortByPrize, type ScheduleEvent } from "@/components/listing/schedule-calendar";
import { ScheduleModal } from "@/components/listing/schedule-modal";
import { dayLabel } from "@/lib/job-events";
import { prizeToWon } from "@/lib/prize";
import { assignScheduleColors, colorFor } from "@/lib/schedule-colors";

type Selected = { event: ScheduleEvent; color: string };
type DayList = { date: string; items: ScheduleEvent[] };

export function ScheduleBoard({
  events,
  year: initialYear,
  month: initialMonth,
  loggedIn = false,
}: {
  events: ScheduleEvent[];
  year: number;
  month: number;
  loggedIn?: boolean;
}) {
  const [mode, setMode] = useState<"calendar" | "list">("calendar");
  const [cursor, setCursor] = useState({ year: initialYear, month: initialMonth });
  const [selected, setSelected] = useState<Selected | null>(null);
  const [dayList, setDayList] = useState<DayList | null>(null);
  const close = useCallback(() => setSelected(null), []);
  // 리스트 보기: 날짜 순, 같은 날은 상금 큰 순
  const sorted = [...events].sort(
    (a, b) => (a.eventDate ?? "").localeCompare(b.eventDate ?? "") || prizeToWon(b.eventPrize) - prizeToWon(a.eventPrize),
  );
  const listColors = assignScheduleColors(events);

  const shift = (delta: number) =>
    setCursor(({ year, month }) => {
      const next = new Date(year, month + delta, 1);
      return { year: next.getFullYear(), month: next.getMonth() };
    });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" size="sm" variant={mode === "calendar" ? "default" : "outline"} className={mode === "calendar" ? "ink-on" : "ink-btn"} onClick={() => setMode("calendar")}>
          달력
        </Button>
        <Button type="button" size="sm" variant={mode === "list" ? "default" : "outline"} className={mode === "list" ? "ink-on" : "ink-btn"} onClick={() => setMode("list")}>
          리스트
        </Button>
        {mode === "calendar" ? (
          <div className="ml-auto flex items-center gap-1">
            <button
              type="button"
              aria-label="이전 달"
              className="grid size-10 place-items-center rounded-lg text-[#e7c98a] hover:bg-white/10"
              onClick={() => shift(-1)}
            >
              <ChevronLeftIcon className="size-5" />
            </button>
            <p className="min-w-24 text-center text-base font-bold text-white" aria-live="polite">
              {cursor.year}년 {cursor.month + 1}월
            </p>
            <button
              type="button"
              aria-label="다음 달"
              className="grid size-10 place-items-center rounded-lg text-[#e7c98a] hover:bg-white/10"
              onClick={() => shift(1)}
            >
              <ChevronRightIcon className="size-5" />
            </button>
          </div>
        ) : null}
      </div>
      {mode === "calendar" ? (
        <>
          <ScheduleCalendar
            year={cursor.year}
            month={cursor.month}
            events={events}
            onSelect={(event, color) => setSelected({ event, color })}
            onMore={(date, items) => setDayList({ date, items })}
          />
          <p className="text-xs text-[#8a8278]">같은 날은 총상금이 큰 대회부터 보입니다. 대회마다 색이 다릅니다.</p>
        </>
      ) : (
        <ul className="grid gap-2.5">
          {sorted.length === 0 ? (
            <li className="ink-panel rounded-xl px-4 py-10 text-center text-sm text-[#D1D5DB]">
              등록된 대회가 없습니다.
            </li>
          ) : (
            sorted.map((event) => {
              const color = colorFor(listColors, event.title);
              return (
                <li key={event.id}>
                  <button
                    type="button"
                    onClick={() => setSelected({ event, color })}
                    style={{ borderLeftColor: color }}
                    className="ink-panel touch-target flex w-full gap-3 rounded-xl border-l-4 p-3 text-left text-white hover:bg-[#241c1e]"
                  >
                    {event.poster && !event.poster.startsWith("/banners/") ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={event.poster} alt="" className="h-24 w-[4.5rem] shrink-0 rounded-lg bg-black object-contain" />
                    ) : null}
                    <div className="min-w-0">
                      <p className="font-semibold text-[#ebe5d9]">{event.title}</p>
                      <p className="mt-1 text-sm text-[#9a9287]">
                        {[dateRange(event.eventDate, event.eventEndDate), event.promoLocation || event.jobLocation]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                      {event.eventPrize ? (
                        <p className="mt-1.5 text-sm font-semibold" style={{ color }}>
                          {event.eventPrize}
                        </p>
                      ) : null}
                    </div>
                  </button>
                </li>
              );
            })
          )}
        </ul>
      )}
      {dayList ? (
        <DayListModal
          list={dayList}
          colors={assignScheduleColors(events)}
          onPick={(event, color) => {
            setDayList(null);
            setSelected({ event, color });
          }}
          onClose={() => setDayList(null)}
        />
      ) : null}
      {selected ? <ScheduleModal event={selected.event} color={selected.color} loggedIn={loggedIn} onClose={close} /> : null}
    </div>
  );
}

/** 한 칸에 다 못 보인 날의 대회 목록(상금 큰 순) */
function DayListModal({
  list,
  colors,
  onPick,
  onClose,
}: {
  list: DayList;
  colors: Map<string, string>;
  onPick: (event: ScheduleEvent, color: string) => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-4">
      <button type="button" aria-label="닫기" className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${dayLabel(list.date)} 대회`}
        className="relative w-full max-w-sm rounded-t-2xl border border-[#c9a25c]/40 bg-[#1d1611] p-4 sm:rounded-2xl"
      >
        <div className="mb-3 flex items-center">
          <p className="flex-1 text-base font-bold text-[#ebe5d9]">{dayLabel(list.date)} 대회 {list.items.length}개</p>
          <button type="button" aria-label="닫기" onClick={onClose} className="grid size-9 place-items-center rounded-full hover:bg-white/10">
            <XIcon className="size-5 text-[#c9c0b2]" />
          </button>
        </div>
        <ul className="grid max-h-[60dvh] gap-1.5 overflow-y-auto">
          {sortByPrize(list.items).map((event) => {
            const color = colorFor(colors, event.title);
            return (
              <li key={event.id}>
                <button
                  type="button"
                  onClick={() => onPick(event, color)}
                  style={{ borderLeftColor: color, backgroundColor: `${color}1f` }}
                  className="flex w-full items-center gap-2 rounded-lg border-l-4 px-3 py-2.5 text-left hover:brightness-125"
                >
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-[#ebe5d9]">{event.title}</span>
                  {event.eventPrize ? <span className="shrink-0 text-xs font-semibold text-[#c9c0b2]">{event.eventPrize}</span> : null}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>,
    document.body,
  );
}

function dateRange(start?: string | null, end?: string | null) {
  if (!start) return "";
  if (!end || end === start) return start;
  return `${start} ~ ${end}`;
}
