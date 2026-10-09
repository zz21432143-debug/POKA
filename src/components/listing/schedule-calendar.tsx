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
    <div className="overflow-x-auto rounded-2xl border border-[#3a332c] bg-[#1A1617]">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <thead>
          <tr className="bg-[#141110]">
            {WEEKDAYS.map((day, index) => (
              <th
                key={day}
                className={
                  index >= 5
                    ? "border-b border-[#3a332c] px-2 py-2.5 text-sm font-semibold text-[#C59B27]"
                    : "border-b border-[#3a332c] px-2 py-2.5 text-sm font-semibold text-white"
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
                  <td key={col} className="h-28 border border-[#3a332c] bg-[#1A1617] p-1.5 align-top">
                    {day ? (
                      <p className="text-sm font-medium text-white">
                        <span
                          className={
                            isToday
                              ? "inline-flex size-7 items-center justify-center rounded-full bg-[#8B2222] font-semibold text-white"
                              : undefined
                          }
                        >
                          {day}
                        </span>
                      </p>
                    ) : null}
                    <ul className="mt-1 flex flex-col gap-1">
                      {items.map((item) => (
                        <li key={`${item.id}-${iso}`}>
                          <Link
                            href={`/posts/${item.id}`}
                            className="block rounded-md bg-[#3a2426] px-1.5 py-1 text-[11px] font-medium leading-snug text-white hover:bg-[#8B2222] hover:text-white"
                          >
                            {item.title}
                            {item.promoLocation || item.jobLocation ? (
                              <span className="mt-1 block truncate text-[10px] font-medium text-[#C59B27]">
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
