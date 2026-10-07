import Link from "next/link";
import {
  BriefcaseIcon,
  CalendarDaysIcon,
  CheckCircle2Icon,
  MessageCircleIcon,
} from "lucide-react";

const ITEMS = [
  { href: "/attendance", title: "출석체크", icon: CheckCircle2Icon, navy: true },
  { href: "/boards/free", title: "자유 게시판", icon: MessageCircleIcon, navy: false },
  { href: "/boards/jobs", title: "구인·구직", icon: BriefcaseIcon, navy: false },
  { href: "/boards/schedule", title: "대회 일정", icon: CalendarDaysIcon, navy: false },
] as const;

export function HomeShortcuts() {
  return (
    <ul className="grid grid-cols-4 gap-2">
      {ITEMS.map((item) => (
        <li key={item.href}>
          <Link
            href={item.href}
            className={
              item.navy
                ? "touch-target flex min-h-11 flex-col items-center justify-center gap-1 rounded-2xl bg-[#07150f] px-1 py-2 text-center text-white sm:min-h-12 sm:flex-row sm:gap-2 sm:px-3"
                : "touch-target flex min-h-11 flex-col items-center justify-center gap-1 rounded-2xl border border-border bg-white px-1 py-2 text-center shadow-sm hover:border-primary/40 sm:min-h-12 sm:flex-row sm:gap-2 sm:px-3"
            }
          >
            <item.icon className={`size-4 shrink-0 ${item.navy ? "text-emerald-300" : "text-primary"}`} />
            <span className="text-[11px] font-semibold leading-tight sm:text-sm">{item.title}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
