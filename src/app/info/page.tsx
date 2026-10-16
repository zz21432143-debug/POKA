import type { Metadata } from "next";
import Link from "@/components/ui/link";
import { BookOpenIcon, CalendarDaysIcon, GraduationCapIcon } from "lucide-react";
import { BOARD_STICKER, BoardTitle } from "@/components/brand/oni";
import { prisma } from "@/lib/db";
import { todayKstDate } from "@/lib/dates";
import { GUIDE_CATEGORIES } from "@/lib/guide-links";
import { GUIDE_ARTICLES } from "@/lib/info-pages";

export const metadata: Metadata = { title: "대회 · 정보" };
export const revalidate = 600;

const CARDS = [
  { href: "/boards/schedule", title: "홀덤 대회 캘린더", body: "이번 주 허브와 일자별 달력.", icon: CalendarDaysIcon },
  { href: "/boards/tda", title: "TDA 룰", body: "토너먼트 공식 홀덤 룰 정리.", icon: BookOpenIcon },
  { href: "/study", title: "홀덤 공부 도구", body: "GTO 푸시폴드 · 승률 · ICM · 레인지 · 족보 · 딜러 가이드.", icon: GraduationCapIcon },
] as const;

/** 다가오는 대회(진행 중 포함) 6개 */
async function UpcomingEvents() {
  const today = todayKstDate();
  const rows = await prisma.post
    .findMany({
      where: {
        boardType: "SCHEDULE",
        hidden: false,
        OR: [{ eventEndDate: { gte: today } }, { eventEndDate: null, eventDate: { gte: today } }],
      },
      orderBy: { eventDate: "asc" },
      take: 6,
      select: { id: true, title: true, eventDate: true, eventEndDate: true, promoLocation: true },
    })
    .catch(() => []);
  if (!rows.length) return null;
  const md = (d: string | null) => (d ? `${Number(d.slice(5, 7))}/${Number(d.slice(8, 10))}` : "");
  return (
    <section aria-label="다가오는 대회" className="ink-panel grid gap-2 rounded-2xl p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-black text-[#f3d9a4]">🗓 다가오는 대회</h2>
        <Link href="/boards/schedule" className="inline-flex min-h-10 items-center text-xs font-bold text-[#e7c98a] hover:underline">
          캘린더 ›
        </Link>
      </div>
      <ul className="grid gap-1.5">
        {rows.map((r) => (
          <li key={r.id}>
            <Link href={`/posts/${r.id}`} className="flex min-h-11 items-center gap-2 rounded-lg px-2 hover:bg-white/[0.05]">
              <span className="w-24 shrink-0 text-xs font-bold text-[#c9b48a] tabular-nums">
                {md(r.eventDate)}
                {r.eventEndDate && r.eventEndDate !== r.eventDate ? ` ~ ${md(r.eventEndDate)}` : ""}
              </span>
              <span className="min-w-0 flex-1 truncate text-[15px] font-bold text-white">{r.title}</span>
              {r.promoLocation ? <span className="hidden max-w-40 shrink-0 truncate text-xs text-zinc-400 sm:inline">{r.promoLocation}</span> : null}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function InfoHubPage() {
  return (
    <div className="flex flex-col gap-5">
      <header className="board-intro">
        <BoardTitle sticker={BOARD_STICKER.info}>대회 · 정보</BoardTitle>
        <p className="mt-2">대회 일정과 TDA 룰. 공부 · 계산 도구는 「홀덤 공부」에 모았어요.</p>
      </header>
      <ul className="grid gap-3 sm:grid-cols-3">
        {CARDS.map((card) => (
          <li key={card.href}>
            <Link
              href={card.href}
              className="ink-panel touch-target flex h-full min-h-28 flex-col rounded-2xl p-5 hover:bg-[#241c1e]"
            >
              <card.icon className="size-5 text-[#C59B27]" />
              <p className="mt-3 font-bold text-white">{card.title}</p>
              <p className="mt-1 text-sm text-[#D1D5DB]">{card.body}</p>
            </Link>
          </li>
        ))}
      </ul>
      <div className="grid gap-3 lg:grid-cols-2 lg:items-start">
        <UpcomingEvents />
        {/* 딜러 가이드 분류 바로가기 */}
        <section aria-label="딜러 가이드" className="ink-panel grid gap-2 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-black text-[#f3d9a4]">📘 딜러 가이드 {GUIDE_ARTICLES.length}편</h2>
            <Link href="/info/guide" className="inline-flex min-h-10 items-center text-xs font-bold text-[#e7c98a] hover:underline">
              전체 ›
            </Link>
          </div>
          <ul className="grid grid-cols-2 gap-2">
            {GUIDE_CATEGORIES.map((c) => (
              <li key={c.id}>
                <Link href={`/info/guide#${c.id}`} className="flex min-h-16 flex-col justify-center rounded-xl border border-white/10 bg-black/25 px-3 py-2 hover:border-[#c9a25c]/60">
                  <span className="text-sm font-bold text-white">
                    {c.label} <span className="text-xs text-[#c9b48a]">{c.slugs.length}편</span>
                  </span>
                  <span className="mt-0.5 text-xs text-zinc-400">{c.hint}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
