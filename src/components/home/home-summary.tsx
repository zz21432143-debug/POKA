import Link from "@/components/ui/link";
import { BellIcon, BriefcaseIcon, CalendarCheckIcon, CalendarDaysIcon, ChevronRightIcon, FlameIcon } from "lucide-react";
import { getHomeCounts } from "@/lib/home-data";
import { ttlCache } from "@/lib/ttl-cache";

/** 오늘 날짜 빈자리 수(1분 캐시) */
function todaySlotCount() {
  return ttlCache("home-today-slots", 60_000, async () => {
    const { loadJobBoard } = await import("@/lib/job-board");
    const b = await loadJobBoard(null);
    return b.slots.filter((s) => s.date === b.today).length;
  });
}

/** "11/28" · "11/28~11/29" */
function shortDate(start: string | null, end: string | null) {
  const md = (d: string) => `${Number(d.slice(5, 7))}/${Number(d.slice(8, 10))}`;
  if (!start) return "";
  return end && end !== start ? `${md(start)}~${md(end)}` : md(start);
}

/** 홈 오늘 요약 한 줄: 모집 중 · 급구 · 이번 주 대회 + 최신 공지 */
export async function HomeSummary({ side }: { side?: React.ReactNode } = {}) {
  const [counts, todaySlots] = await Promise.all([getHomeCounts().catch(() => null), todaySlotCount().catch(() => 0)]);
  if (!counts) return null;
  const items = [
    todaySlots
      ? { href: "/boards/jobs/slots?d=today", icon: CalendarCheckIcon, label: "오늘 빈자리", value: todaySlots as number | string, tone: "text-xl text-[#ffcf4a]" }
      : { href: "/boards/jobs/available", icon: BellIcon, label: "빈자리 알림", value: "🔔 받기" as number | string, tone: "text-[15px] whitespace-nowrap text-[#ffcf4a]" },
    { href: "/boards/jobs", icon: BriefcaseIcon, label: "모집 중", value: counts.jobs, tone: "text-xl text-[#f3d9a4]" },
    { href: "/boards/jobs/urgent", icon: FlameIcon, label: "급구", value: counts.urgent, tone: "text-xl text-rose-300" },
    { href: "/boards/schedule", icon: CalendarDaysIcon, label: "예정 대회", value: counts.events, tone: "text-xl text-sky-200" },
  ];
  return (
    <section aria-label="오늘 요약" className="lounge-card grid gap-2 rounded-[1.35rem] p-2 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center sm:p-2.5 xl:grid-cols-[auto_minmax(0,1fr)_17rem]">
      <ul className="grid grid-cols-4 gap-1.5">
        {items.map((it) => (
          <li key={it.href}>
            <Link href={it.href} className="touch-target flex min-h-14 flex-col items-center justify-center rounded-xl bg-black/35 px-1.5 hover:bg-black/55 sm:min-w-28 sm:px-3">
              <span className="flex items-center gap-1 text-[12px] font-bold whitespace-nowrap text-[#b9aa92] sm:text-[11px]">
                <it.icon className="hidden size-3.5 sm:block" />
                {it.label}
              </span>
              <span className={`leading-tight font-black tabular-nums ${it.tone}`}>{it.value}</span>
            </Link>
          </li>
        ))}
      </ul>
      <div className="grid min-w-0 gap-0.5">
      {counts.nextEvent ? (
        <Link href={`/posts/${counts.nextEvent.id}`} className="touch-target flex min-h-10 min-w-0 items-center gap-2 rounded-xl px-2 hover:bg-black/35">
          <CalendarDaysIcon className="size-4 shrink-0 text-sky-300" />
          <span className="shrink-0 text-xs font-black text-sky-300">다음 대회</span>
          <span className="min-w-0 flex-1 truncate text-sm font-semibold text-[#ece3d3]">{counts.nextEvent.title}</span>
          <span className="shrink-0 text-xs font-bold text-[#a89880] tabular-nums">{shortDate(counts.nextEvent.eventDate, counts.nextEvent.eventEndDate)}</span>
        </Link>
      ) : null}
      {counts.notice ? (
        <Link href={`/posts/${counts.notice.id}`} className="touch-target flex min-h-11 min-w-0 items-center gap-2 rounded-xl px-2 hover:bg-black/35">
          <BellIcon className="size-4 shrink-0 text-[#c9a25c]" />
          <span className="shrink-0 text-xs font-black text-[#c9a25c]">공지</span>
          <span className="min-w-0 flex-1 truncate text-sm font-semibold text-[#ece3d3]">{counts.notice.title}</span>
          <ChevronRightIcon className="size-4 shrink-0 text-[#a89880]" />
        </Link>
      ) : null}
      </div>
      {/* 작은 요괴 칸(휴대폰 · 태블릿은 아래 한 줄) */}
      {side ? <div className="min-w-0 sm:col-span-2 xl:col-span-1">{side}</div> : null}
    </section>
  );
}
