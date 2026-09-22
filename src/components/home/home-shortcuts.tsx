import Link from "next/link";
import {
  BriefcaseIcon,
  CalendarDaysIcon,
  LightbulbIcon,
  MessageCircleIcon,
} from "lucide-react";

const CARDS = [
  {
    href: "/boards/free",
    title: "오늘의 인기글",
    body: "지금 커뮤니티에서 가장 뜨거운 이야기를 확인해보세요.",
    icon: MessageCircleIcon,
  },
  {
    href: "/boards/jobs",
    title: "딜러 구인 · 구직",
    body: "새로운 기회를 찾는 딜러와 매장을 위한 현장 구인입니다.",
    icon: BriefcaseIcon,
  },
  {
    href: "/info/tips",
    title: "노하우 & 팁",
    body: "선배 딜러들의 경험에서 얻는 실전 노하우를 확인하세요.",
    icon: LightbulbIcon,
  },
  {
    href: "/boards/schedule",
    title: "이벤트",
    body: "다양한 이벤트와 소식을 가장 빠르게 만나보세요.",
    icon: CalendarDaysIcon,
  },
] as const;

export function HomeShortcuts() {
  return (
    <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {CARDS.map((card) => (
        <li key={card.href}>
          <Link
            href={card.href}
            className="navy-panel touch-target group flex h-full min-h-[8.5rem] flex-col rounded-2xl p-4 text-white shadow-sm"
          >
            <card.icon className="size-5 text-emerald-300" />
            <p className="mt-3 text-sm font-semibold">{card.title}</p>
            <p className="mt-1 flex-1 text-xs leading-5 text-white/70">{card.body}</p>
            <span className="mt-3 text-emerald-300 transition-transform group-hover:translate-x-0.5">
              →
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
