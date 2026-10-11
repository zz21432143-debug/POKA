import { todayKstDate } from "@/lib/dates";
import { prizeToWon } from "@/lib/prize";
import { SCHEDULE_TEXT, assignScheduleColors, colorFor } from "@/lib/schedule-colors";
import { cn } from "cn";

export type ScheduleEvent = {
  id: string;
  title: string;
  eventDate: string | null;
  eventEndDate?: string | null;
  eventPrize?: string | null;
  eventLink?: string | null;
  poster?: string | null;
  promoLocation: string | null;
  jobLocation: string | null;
  /** 상세 내용. 비로그인이면 null로 내려옵니다. */
  content?: string | null;
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

/** 같은 날 대회: 총상금 큰 순서, 같으면 이름 순 */
export function sortByPrize(items: ScheduleEvent[]) {
  return [...items].sort((a, b) => prizeToWon(b.eventPrize) - prizeToWon(a.eventPrize) || a.title.localeCompare(b.title, "ko"));
}

/** 보이는 달에 걸친 대회들의 색 */
export function monthColors(events: ScheduleEvent[], year: number, month: number) {
  const first = `${year}-${pad(month + 1)}-01`;
  const last = `${year}-${pad(month + 1)}-${pad(new Date(year, month + 1, 0).getDate())}`;
  return assignScheduleColors(
    events.filter((e) => e.eventDate && e.eventDate <= last && (e.eventEndDate || e.eventDate) >= first),
  );
}

const WEEKDAYS = ["월", "화", "수", "목", "금", "토", "일"] as const;
/** 한 칸에 보여 줄 대회 수(휴대폰 2, PC 3). 넘치면 "+N"으로 그날 목록을 엽니다. */
const MOBILE_MAX = 2;
const DESKTOP_MAX = 3;

/**
 * 대회 캘린더. 날짜 칸에는 대회명만, 총상금 큰 순서로 보여 줍니다.
 * 대회마다 확실히 다른 색 칸(같은 대회는 여러 날이어도 같은 색)에 어두운 글자를 올려 구분이 쉽고 눈부시지 않게 합니다.
 */
export function ScheduleCalendar({
  events,
  year,
  month,
  onSelect,
  onMore,
}: {
  events: ScheduleEvent[];
  year: number;
  month: number;
  onSelect: (event: ScheduleEvent, color: string) => void;
  onMore: (date: string, items: ScheduleEvent[]) => void;
}) {
  const weeks = monthMatrix(year, month);
  const today = todayKstDate();
  const colors = monthColors(events, year, month);
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
    <div className="schedule-calendar overflow-hidden rounded-2xl border border-[#2c2724] bg-[#151211]">
      <table className="w-full table-fixed border-collapse text-sm">
        <thead>
          <tr className="bg-[#110e0d]">
            {WEEKDAYS.map((day, index) => (
              <th
                key={day}
                className={cn(
                  "border-b border-[#2c2724] px-0.5 py-2 text-xs font-medium sm:px-2 sm:py-2.5 sm:text-[13px]",
                  index === 5 ? "text-[#8fb3d9]" : index === 6 ? "text-[#d99a9a]" : "text-[#a8a096]",
                )}
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
                const items = iso ? sortByPrize(byDay.get(iso) ?? []) : [];
                const isToday = iso !== "" && iso === today;
                const past = iso !== "" && iso < today;
                return (
                  <td
                    key={col}
                    className={cn(
                      "schedule-cell h-[5.5rem] border border-[#2a2522] p-0.5 align-top sm:h-28 sm:p-1.5",
                      day ? "bg-[#1a1716]" : "bg-[#131110]",
                      past && "opacity-60",
                    )}
                  >
                    {day ? (
                      <p className="schedule-day mb-0.5 text-[11px] font-medium leading-none sm:mb-1 sm:text-xs">
                        <span
                          className={cn(
                            "inline-flex size-5 items-center justify-center rounded-full sm:size-6",
                            isToday
                              ? "bg-[#c9a25c] font-bold text-[#1d1611]"
                              : col === 5
                                ? "text-[#8fb3d9]"
                                : col === 6
                                  ? "text-[#d99a9a]"
                                  : "text-[#a8a096]",
                          )}
                        >
                          {day}
                        </span>
                      </p>
                    ) : null}
                    <ul className="flex flex-col gap-[3px] sm:gap-1">
                      {items.slice(0, DESKTOP_MAX).map((item, i) => {
                        const color = colorFor(colors, item.title);
                        return (
                          <li key={`${item.id}-${iso}`} className={i >= MOBILE_MAX ? "hidden sm:block" : undefined}>
                            <button
                              type="button"
                              title={item.eventPrize ? `${item.title} · ${item.eventPrize}` : item.title}
                              onClick={() => onSelect(item, color)}
                              style={{ backgroundColor: color, color: SCHEDULE_TEXT }}
                              className="line-clamp-2 w-full cursor-pointer break-keep [overflow-wrap:anywhere] rounded-[4px] px-1 py-[3px] text-left text-[10px] font-bold leading-tight tracking-tight sm:line-clamp-1 transition-[filter] hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#c9a25c] sm:px-1.5 sm:py-1 sm:text-[11.5px]"
                            >
                              {item.title}
                            </button>
                          </li>
                        );
                      })}
                      {items.length > MOBILE_MAX ? (
                        <li className={items.length > DESKTOP_MAX ? undefined : "sm:hidden"}>
                          <button
                            type="button"
                            onClick={() => onMore(iso, items)}
                            className="w-full rounded-[4px] px-1 py-[2px] text-left text-[10px] font-semibold text-[#c9a25c] hover:bg-white/5 sm:text-[11px]"
                          >
                            <span className="sm:hidden">+{items.length - MOBILE_MAX}</span>
                            <span className="hidden sm:inline">+{items.length - DESKTOP_MAX}개 더</span>
                          </button>
                        </li>
                      ) : null}
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
