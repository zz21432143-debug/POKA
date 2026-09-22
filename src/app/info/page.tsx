import { INFO_PAGES } from "@/lib/info-pages";
import Link from "next/link";
import { BookOpenIcon, CalendarDaysIcon, LightbulbIcon, MegaphoneIcon } from "lucide-react";

const CARDS = [
  { href: "/info/guide", title: "딜러 가이드", body: "입문, 매너, 테이블 운영의 기본.", icon: BookOpenIcon },
  { href: "/info/tips", title: "팁 & 노하우", body: "현장에서 쌓인 실전 팁.", icon: LightbulbIcon },
  { href: "/boards/schedule", title: "대회 스케줄", body: "일자별 · 월별 토너먼트 일정.", icon: CalendarDaysIcon },
  { href: "/boards/official", title: "공식 홍보", body: "제휴 · 협찬 포스터.", icon: MegaphoneIcon },
] as const;

export default function InfoHubPage() {
  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="text-2xl font-semibold">정보센터</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          딜러 가이드, 팁, 대회 스케줄, 공식 홍보를 모았습니다. 가이드·팁 {INFO_PAGES.guide.length + INFO_PAGES.tips.length}편.
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
