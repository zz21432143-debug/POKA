import Link from "next/link";
import { BellIcon, BriefcaseIcon, CalendarDaysIcon, ChevronRightIcon, FlameIcon } from "lucide-react";
import { getHomeCounts } from "@/lib/home-data";

/** 홈 오늘 요약 한 줄: 모집 중 · 급구 · 이번 주 대회 + 최신 공지 */
export async function HomeSummary() {
  const counts = await getHomeCounts().catch(() => null);
  if (!counts) return null;
  const items = [
    { href: "/boards/jobs", icon: BriefcaseIcon, label: "모집 중", value: counts.jobs, tone: "text-[#f3d9a4]" },
    { href: "/boards/jobs/urgent", icon: FlameIcon, label: "급구", value: counts.urgent, tone: "text-rose-300" },
    { href: "/boards/schedule", icon: CalendarDaysIcon, label: "이번 주 대회", value: counts.events, tone: "text-sky-200" },
  ];
  return (
    <section aria-label="오늘 요약" className="lounge-card grid gap-2 rounded-[1.35rem] p-2 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center sm:p-2.5">
      <ul className="grid grid-cols-3 gap-1.5">
        {items.map((it) => (
          <li key={it.href}>
            <Link href={it.href} className="touch-target flex min-h-14 flex-col items-center justify-center rounded-xl bg-black/35 px-3 hover:bg-black/55 sm:min-w-28">
              <span className="flex items-center gap-1 text-[11px] font-bold text-[#a89880]">
                <it.icon className="size-3.5" />
                {it.label}
              </span>
              <span className={`text-xl leading-tight font-black tabular-nums ${it.tone}`}>{it.value}</span>
            </Link>
          </li>
        ))}
      </ul>
      {counts.notice ? (
        <Link href={`/posts/${counts.notice.id}`} className="touch-target flex min-h-11 min-w-0 items-center gap-2 rounded-xl px-2 hover:bg-black/35">
          <BellIcon className="size-4 shrink-0 text-[#c9a25c]" />
          <span className="shrink-0 text-xs font-black text-[#c9a25c]">공지</span>
          <span className="min-w-0 flex-1 truncate text-sm font-semibold text-[#ece3d3]">{counts.notice.title}</span>
          <ChevronRightIcon className="size-4 shrink-0 text-[#a89880]" />
        </Link>
      ) : null}
    </section>
  );
}
