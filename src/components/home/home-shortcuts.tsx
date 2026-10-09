import Link from "next/link";
import { BriefcaseIcon, CalendarDaysIcon, LayoutListIcon, MessageCircleIcon } from "lucide-react";

const ITEMS = [
  { href: "/community", title: "전체게시글", icon: LayoutListIcon },
  { href: "/boards/free", title: "자유 게시판", icon: MessageCircleIcon },
  { href: "/boards/jobs", title: "구인·구직", icon: BriefcaseIcon },
  { href: "/boards/schedule", title: "대회 일정", icon: CalendarDaysIcon },
] as const;

export function HomeShortcuts() {
  return (
    <ul className="flex flex-wrap gap-2">
      {ITEMS.map((item) => (
        <li key={item.href} className="min-w-0 flex-1 basis-[calc(50%-0.25rem)] sm:basis-0">
          <Link
            href={item.href}
            className="touch-target relative z-10 flex min-h-11 items-center justify-center gap-2 rounded-full border border-[#c9a25c]/35 bg-[#1d1611]/95 px-3 text-center text-[13px] font-semibold text-[#f3eadb] hover:border-[#c9a25c]/70 hover:bg-[#2a2017]"
          >
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#e7c98a] to-[#8b2222] text-[#120d0a]">
              <item.icon className="size-3.5" />
            </span>
            <span className="leading-tight">{item.title}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
