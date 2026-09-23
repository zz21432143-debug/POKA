import { GUIDE_ARTICLES } from "@/lib/info-pages";
import Link from "next/link";
import { BookOpenIcon, CalendarDaysIcon, MegaphoneIcon, UsersIcon } from "lucide-react";

const CARDS = [
  { href: "/info/guide", title: "홀덤 딜러 가이드", body: "검색용 상설 글 10편.", icon: BookOpenIcon },
  { href: "/info/dealers", title: "인증 딜러", body: "골드 뱃지 딜러와 최근 핸드.", icon: UsersIcon },
  { href: "/boards/schedule", title: "홀덤 대회 스케줄", body: "이번 주 허브와 일자별 달력.", icon: CalendarDaysIcon },
  { href: "/boards/official", title: "공식 홍보", body: "제휴 · 협찬 포스터.", icon: MegaphoneIcon },
] as const;

export default function InfoHubPage() {
  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="text-2xl font-semibold">정보센터</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          홀덤 가이드 {GUIDE_ARTICLES.length}편, 인증 딜러, 대회 일정, 공식 홍보.
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
