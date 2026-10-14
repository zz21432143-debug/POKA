import type { Metadata } from "next";
import Link from "next/link";
import { BookOpenIcon, CalendarDaysIcon, GraduationCapIcon } from "lucide-react";
import { BOARD_STICKER, BoardTitle } from "@/components/brand/oni";

export const metadata: Metadata = { title: "대회 · 정보" };

const CARDS = [
  { href: "/boards/schedule", title: "홀덤 대회 캘린더", body: "이번 주 허브와 일자별 달력.", icon: CalendarDaysIcon },
  { href: "/boards/tda", title: "TDA 룰", body: "토너먼트 공식 홀덤 룰 정리.", icon: BookOpenIcon },
  { href: "/study", title: "홀덤 공부 도구", body: "GTO 푸시폴드 · 승률 · ICM · 레인지 · 족보 · 딜러 가이드.", icon: GraduationCapIcon },
] as const;

export default function InfoHubPage() {
  return (
    <div className="flex flex-col gap-5">
      <header className="board-intro">
        <BoardTitle sticker={BOARD_STICKER.info}>대회 · 정보</BoardTitle>
        <p className="mt-2">대회 일정과 TDA 룰. 공부 · 계산 도구는 「홀덤 공부」에 모았어요.</p>
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
