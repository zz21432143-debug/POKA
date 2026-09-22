import { INFO_PAGES } from "@/lib/info-pages";
import Link from "next/link";
import { BookOpenIcon, CalendarDaysIcon, LightbulbIcon, NewspaperIcon } from "lucide-react";

const CARDS = [
  { href: "/info/guide", title: "딜러 가이드", body: "입문, 매너, 테이블 운영의 기본.", icon: BookOpenIcon },
  { href: "/info/tips", title: "팁 & 노하우", body: "현장에서 쌓인 실전 팁.", icon: LightbulbIcon },
  { href: "/info/news", title: "업계 뉴스", body: "룸·펍·토너먼트 소식.", icon: NewspaperIcon },
  { href: "/boards/schedule", title: "이벤트", body: "대회 일정과 이벤트.", icon: CalendarDaysIcon },
] as const;

export default function InfoHubPage() {
  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="text-2xl font-semibold">정보센터</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          딜러 가이드부터 업계 뉴스, 이벤트까지 모았습니다. 등록 글 {INFO_PAGES.guide.length * 3}편.
        </p>
      </header>
      <ul className="grid gap-3 sm:grid-cols-2">
        {CARDS.map((card) => (
          <li key={card.href}>
            <Link
              href={card.href}
              className="touch-target flex min-h-28 flex-col rounded-2xl border border-border bg-white p-5 shadow-sm hover:border-primary/40"
            >
              <card.icon className="size-5 text-primary" />
              <p className="mt-3 font-semibold">{card.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{card.body}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
