import Link from "next/link";
import {
  BriefcaseIcon,
  CalendarDaysIcon,
  LayoutListIcon,
  MessageCircleIcon,
} from "lucide-react";

const ITEMS = [
  { href: "/community", title: "전체게시글", icon: LayoutListIcon, filled: true },
  { href: "/boards/free", title: "자유 게시판", icon: MessageCircleIcon, filled: false },
  { href: "/boards/jobs", title: "구인·구직", icon: BriefcaseIcon, filled: false },
  { href: "/boards/schedule", title: "대회 일정", icon: CalendarDaysIcon, filled: false },
] as const;

export function HomeShortcuts() {
  return (
    <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {ITEMS.map((item) => (
        <li key={item.href}>
          <Link
            href={item.href}
            className={
              item.filled
                ? "touch-target relative z-10 flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#0d3b24] px-3 text-center text-sm font-semibold text-white shadow-sm"
                : "touch-target relative z-10 flex min-h-12 items-center justify-center gap-2 rounded-full border border-[#d7ccb8] bg-[#fffcf7] px-3 text-center text-sm font-semibold text-foreground shadow-sm hover:border-primary"
            }
          >
            <item.icon className={`size-4 shrink-0 ${item.filled ? "text-emerald-300" : "text-primary"}`} />
            <span className="leading-tight">{item.title}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
