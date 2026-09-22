import Link from "next/link";
import { Badge } from "@/components/ui/badge";

export type ScheduleEvent = {
  id: string;
  title: string;
  eventDate: string | null;
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
  const byDay = new Map<string, ScheduleEvent[]>();
  for (const event of events) {
    if (!event.eventDate) continue;
    const list = byDay.get(event.eventDate) ?? [];
    list.push(event);
    byDay.set(event.eventDate, list);
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-border">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <thead>
          <tr className="bg-muted/50">
            {["월", "화", "수", "목", "금", "토", "일"].map((day) => (
              <th key={day} className="px-2 py-2 font-medium">
                {day}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((week, index) => (
            <tr key={index} className="align-top">
              {week.map((day, col) => {
                const iso =
                  day == null
                    ? ""
                    : `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const items = iso ? (byDay.get(iso) ?? []) : [];
                return (
                  <td key={col} className="h-28 border border-border p-1.5">
                    {day ? <p className="text-xs text-muted-foreground">{day}</p> : null}
                    <ul className="mt-1 flex flex-col gap-1">
                      {items.map((item) => (
                        <li key={item.id}>
                          <Link href={`/posts/${item.id}`} className="block rounded-md bg-primary/10 px-1.5 py-1 text-xs">
                            {item.title}
                            {item.promoLocation || item.jobLocation ? (
                              <Badge variant="outline" className="mt-1">
                                {item.promoLocation || item.jobLocation}
                              </Badge>
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
