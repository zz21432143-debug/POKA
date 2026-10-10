import Link from "next/link";
import { todayKstDate } from "@/lib/dates";

export type ScheduleEvent = {
  id: string;
  title: string;
  eventDate: string | null;
  eventEndDate?: string | null;
  eventPrize?: string | null;
  poster?: string | null;
  promoLocation: string | null;
  jobLocation: string | null;
};

function monthMatrix(year: number, month: number) {
  const first = new Date(year, month, 1);
  const start = (first.getDay() + 6) % 7;
  const days = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(start).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function eachDay(start: string, end: string) {
  const days: string[] = [];
  const cursor = new Date(`${start}T00:00:00`);
  const last = new Date(`${end}T00:00:00`);
  if (Number.isNaN(cursor.getTime())) return days;
  while (cursor <= last) {
    days.push(`${cursor.getFullYear()}-${pad(cursor.getMonth() + 1)}-${pad(cursor.getDate())}`);
    cursor.setDate(cursor.getDate() + 1);
    if (days.length > 60) break;
  }
  return days;
}

const WEEKDAYS = ["월", "화", "수", "목", "금", "토", "일"] as const;

export function ScheduleCalendar({
  events,
  year,
  month,
}: {
  events: ScheduleEvent[];
  year: number;
  month: number;
}) {
  const weeks = monthMatrix(year, month);
  const today = todayKstDate();
  const byDay = new Map<string, ScheduleEvent[]>();
  for (const event of events) {
    if (!event.eventDate) continue;
    const span = eachDay(event.eventDate, event.eventEndDate || event.eventDate);
    for (const day of span) {
      const list = byDay.get(day) ?? [];
      list.push(event);
      byDay.set(day, list);
    }
  }

  return (
    <div className="schedule-calendar overflow-hidden rounded-2xl border border-[#3a332c] bg-[#1A1617]">
      <table className="w-full table-fixed border-collapse text-sm">
        <thead>
          <tr className="bg-[#141110]">
            {WEEKDAYS.map((day, index) => (
              <th
                key={day}
                className={
                  index >= 5
                    ? "border-b border-[#3a332c] px-0.5 py-2 text-xs font-semibold text-[#C59B27] sm:px-2 sm:py-2.5 sm:text-sm"
                    : "border-b border-[#3a332c] px-0.5 py-2 text-xs font-semibold text-white sm:px-2 sm:py-2.5 sm:text-sm"
                }
              >
                {day}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((week, index) => (
            <tr key={index} className="align-top">
              {week.map((day, col) => {
                const iso = day == null ? "" : `${year}-${pad(month + 1)}-${pad(day)}`;
                const items = iso ? (byDay.get(iso) ?? []) : [];
                const isToday = iso !== "" && iso === today;
                return (
                  <td key={col} className="schedule-cell h-20 border border-[#3a332c] bg-[#1A1617] p-0.5 align-top sm:h-28 sm:p-1.5">
                    {day ? (
                      <p className="schedule-day text-xs font-medium text-white sm:text-sm">
                        <span
                          className={
                            isToday
                              ? "inline-flex size-6 items-center sm:size-7 justify-center rounded-full bg-[#8B2222] font-semibold text-white"
                              : undefined
                          }
                        >
                          {day}
                        </span>
                      </p>
                    ) : null}
                    <ul className="mt-0.5 flex flex-col gap-0.5 sm:mt-1 sm:gap-1">
                      {items.map((item) => (
                        <li key={`${item.id}-${iso}`}>
                          <Link
                            href={`/posts/${item.id}`}
                            className="overflow-hidden rounded bg-[#3a2426] px-1 py-0.5 text-[10px] font-medium leading-tight break-all text-white line-clamp-2 sm:line-clamp-none sm:rounded-md sm:px-1.5 sm:py-1 sm:text-[11px] sm:leading-snug sm:break-keep hover:bg-[#8B2222] hover:text-white"
                          >
                            {item.title}
                            {item.promoLocation || item.jobLocation ? (
                              <span className="mt-1 hidden truncate text-[10px] font-medium text-[#C59B27] sm:block">
                                {item.promoLocation || item.jobLocation}
                              </span>
                            ) : null}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
