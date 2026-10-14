import type { Metadata } from "next";
import Link from "next/link";
import { BookOpenIcon, CalendarDaysIcon, GraduationCapIcon, PieChartIcon } from "lucide-react";
import { BOARD_STICKER, BoardTitle } from "@/components/brand/oni";

export const metadata: Metadata = { title: "대회 · 정보" };

const CARDS = [
  { href: "/boards/schedule", title: "홀덤 대회 캘린더", body: "이번 주 허브와 일자별 달력.", icon: CalendarDaysIcon },
  { href: "/boards/tda", title: "TDA 룰", body: "토너먼트 공식 홀덤 룰 정리.", icon: BookOpenIcon },
  { href: "/info/guide", title: "딜러 가이드", body: "테이블에서 바로 쓰는 기본 룰.", icon: GraduationCapIcon },
  { href: "/info/icm", title: "ICM 계산기", body: "파이널 테이블 딜 금액을 공정하게.", icon: PieChartIcon },
] as const;

export default function InfoHubPage() {
  return (
    <div className="flex flex-col gap-5">
      <header className="board-intro">
        <BoardTitle sticker={BOARD_STICKER.info}>대회 · 정보</BoardTitle>
        <p className="mt-2">대회 일정, TDA 룰, 딜러 가이드.</p>
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
