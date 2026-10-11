"use client";

import { useCallback, useState } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScheduleCalendar, type ScheduleEvent } from "@/components/listing/schedule-calendar";
import { ScheduleModal } from "@/components/listing/schedule-modal";

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
  const [selected, setSelected] = useState<ScheduleEvent | null>(null);
  const close = useCallback(() => setSelected(null), []);
  const sorted = [...events].sort((a, b) => (a.eventDate ?? "").localeCompare(b.eventDate ?? ""));

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
        <ScheduleCalendar year={cursor.year} month={cursor.month} events={events} onSelect={setSelected} />
      ) : (
        <ul className="grid gap-3">
          {sorted.length === 0 ? (
            <li className="ink-panel rounded-xl px-4 py-10 text-center text-sm text-[#D1D5DB]">
              등록된 대회가 없습니다.
            </li>
          ) : (
            sorted.map((event) => (
              <li key={event.id}>
                <button
                  type="button"
                  onClick={() => setSelected(event)}
                  className="ink-panel touch-target flex w-full gap-3 rounded-xl p-3 text-left text-white hover:bg-[#241c1e]"
                >
                  {event.poster ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={event.poster} alt="" className="size-20 shrink-0 rounded-lg object-cover" />
                  ) : null}
                  <div className="min-w-0">
                    <p className="font-bold text-white">{event.title}</p>
                    <p className="mt-1 text-sm text-[#9CA3AF]">
                      {[event.promoLocation || event.jobLocation, dateRange(event.eventDate, event.eventEndDate)]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {event.eventPrize ? <Badge variant="outline">{event.eventPrize}</Badge> : null}
                    </div>
                  </div>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
      {selected ? <ScheduleModal event={selected} loggedIn={loggedIn} onClose={close} /> : null}
    </div>
  );
}

function dateRange(start?: string | null, end?: string | null) {
  if (!start) return "";
  if (!end || end === start) return start;
  return `${start} ~ ${end}`;
}
