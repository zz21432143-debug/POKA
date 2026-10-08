"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScheduleCalendar, type ScheduleEvent } from "@/components/listing/schedule-calendar";

export function ScheduleBoard({
  events,
  year,
  month,
}: {
  events: ScheduleEvent[];
  year: number;
  month: number;
}) {
  const [mode, setMode] = useState<"calendar" | "list">("calendar");
  const sorted = [...events].sort((a, b) => (a.eventDate ?? "").localeCompare(b.eventDate ?? ""));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <Button type="button" size="sm" variant={mode === "calendar" ? "default" : "outline"} className={mode === "calendar" ? "ink-on" : "ink-btn"} onClick={() => setMode("calendar")}>
          달력
        </Button>
        <Button type="button" size="sm" variant={mode === "list" ? "default" : "outline"} className={mode === "list" ? "ink-on" : "ink-btn"} onClick={() => setMode("list")}>
          리스트
        </Button>
      </div>
      {mode === "calendar" ? (
        <ScheduleCalendar year={year} month={month} events={events} />
      ) : (
        <ul className="grid gap-3">
          {sorted.length === 0 ? (
            <li className="ink-panel rounded-xl px-4 py-10 text-center text-sm text-[#D1D5DB]">
              등록된 대회가 없습니다.
            </li>
          ) : (
            sorted.map((event) => (
              <li key={event.id}>
                <Link
                  href={`/posts/${event.id}`}
                  className="ink-panel touch-target flex gap-3 rounded-xl p-3 text-white hover:bg-[#241c1e] hover:text-white"
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
                </Link>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

function dateRange(start?: string | null, end?: string | null) {
  if (!start) return "";
  if (!end || end === start) return start;
  return `${start} ~ ${end}`;
}
