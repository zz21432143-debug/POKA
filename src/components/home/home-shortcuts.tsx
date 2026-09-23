import Link from "next/link";
import {
  BookOpenIcon,
  BriefcaseIcon,
  CalendarDaysIcon,
  MegaphoneIcon,
} from "lucide-react";

export function HomeShortcuts() {
  return (
    <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <li className="col-span-2 sm:col-span-1">
        <Link
          href="/advertise"
          className="navy-panel touch-target flex h-full min-h-[8.25rem] flex-col rounded-2xl p-4 text-white"
        >
          <MegaphoneIcon className="size-5 text-emerald-300" />
          <p className="mt-3 text-sm font-semibold">홍보하기</p>
          <p className="mt-1 flex-1 text-xs leading-5 text-white/70">
            당신의 소식을 커뮤니티에 홍보하고 보상을 받아보세요.
          </p>
        </Link>
      </li>
      {[
        {
          href: "/boards/jobs",
          title: "딜러 구인 · 구직",
          body: "새로운 기회를 찾는 딜러와 매장을 위한 현장 구인입니다.",
          icon: BriefcaseIcon,
        },
        {
          href: "/info/guide",
          title: "홀덤 딜러 가이드",
          body: "검색용 상설 글 10편. 홀덤 룰만 다룹니다.",
          icon: BookOpenIcon,
        },
        {
          href: "/boards/schedule",
          title: "이번 주 홀덤 대회",
          body: "주간 허브와 일자별 · 월별 토너먼트 달력입니다.",
          icon: CalendarDaysIcon,
        },
      ].map((card) => (
        <li key={card.href}>
          <Link
            href={card.href}
            className="touch-target group flex h-full min-h-[8.25rem] flex-col rounded-2xl border border-border bg-white p-4 shadow-sm hover:border-primary/40"
          >
            <card.icon className="size-5 text-primary" />
            <p className="mt-3 text-sm font-semibold">{card.title}</p>
            <p className="mt-1 flex-1 text-xs leading-5 text-muted-foreground">{card.body}</p>
            <span className="mt-3 ml-auto flex size-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
              →
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
