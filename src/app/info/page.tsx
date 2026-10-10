import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDaysIcon, LightbulbIcon, MegaphoneIcon } from "lucide-react";

export const metadata: Metadata = { title: "정보센터" };

const CARDS = [
  { href: "/practice", title: "딜러 연습", body: "사이드팟 · 미니멈 레이즈 드릴.", icon: LightbulbIcon },
  { href: "/boards/schedule", title: "홀덤 대회 스케줄", body: "이번 주 허브와 일자별 달력.", icon: CalendarDaysIcon },
  { href: "/boards/official", title: "공식 홍보", body: "제휴 · 협찬 포스터.", icon: MegaphoneIcon },
] as const;

export default function InfoHubPage() {
  return (
    <div className="flex flex-col gap-5">
      <header className="board-intro">
        <h1>정보센터</h1>
        <p className="mt-2">딜러 연습, 대회 일정, 공식 홍보.</p>
      </header>
      <ul className="grid gap-3 sm:grid-cols-2">
        {CARDS.map((card) => (
          <li key={card.href}>
            <Link
              href={card.href}
              className="ink-panel touch-target flex min-h-28 flex-col rounded-2xl p-5 hover:bg-[#241c1e]"
            >
              <card.icon className="size-5 text-[#C59B27]" />
              <p className="mt-3 font-bold text-white">{card.title}</p>
              <p className="mt-1 text-sm text-[#D1D5DB]">{card.body}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
