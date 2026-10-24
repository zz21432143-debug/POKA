import Link from "@/components/ui/link";
import { BriefcaseIcon, CalendarCheckIcon, CalendarDaysIcon, MessageCircleIcon, ScrollTextIcon, SpadeIcon, StoreIcon, TrophyIcon } from "lucide-react";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";
import { todayKstDate } from "@/lib/dates";
import { ttlCache } from "@/lib/ttl-cache";
import { cn } from "cn";

const BOARDS = [
  { href: "/boards/jobs/slots", label: "빈자리", type: "JOBS", icon: CalendarDaysIcon, hot: true },
  { href: "/boards/jobs", label: "구인구직", type: "", icon: BriefcaseIcon },
  { href: "/tools", label: "매장 관리", type: "", icon: StoreIcon, store: true },
  { href: "/boards/free", label: "자유", type: "FREE", icon: MessageCircleIcon },
  { href: "/boards/hand-review", label: "핸드리뷰", type: "HAND_REVIEW", icon: SpadeIcon },
  { href: "/boards/tda", label: "TDA 룰", type: "TDA", icon: ScrollTextIcon, tda: true },
  { href: "/boards/schedule", label: "대회일정", type: "SCHEDULE", icon: TrophyIcon },
] as const;

/** 오늘 게시판별 새 글 수(1분 캐시) */
async function todayCounts() {
  return ttlCache("home-board-today", 60_000, async () => {
    const since = new Date(`${todayKstDate()}T00:00:00+09:00`);
    const rows = await prisma.post
      .groupBy({ by: ["boardType"], where: { createdAt: { gte: since }, hidden: false, isAttendanceThread: false }, _count: { _all: true } })
      .catch(() => []);
    return Object.fromEntries(rows.map((r) => [r.boardType, r._count._all])) as Record<string, number>;
  });
}

/** 홈 맨 위: 게시판 바로가기(아래로 내려가지 않아도 바로) · 오늘 새 글 수 · 출석(오늘 안 했으면 눈에 띄게) */
export async function HomeBoardNav() {
  const [counts, user] = await Promise.all([todayCounts().catch(() => ({}) as Record<string, number>), getCurrentUser().catch(() => null)]);
  // 오늘 출석했는지(회원만)
  const checked = user
    ? Boolean(await prisma.dailyAttendance.findUnique({ where: { userId_date: { userId: user.id, date: todayKstDate() } }, select: { id: true } }).catch(() => null))
    : false;
  const attendLabel = !user ? "출석체크" : checked ? "출석 완료" : "출석하기";
  return (
    <nav aria-label="게시판 바로가기" data-home-board-nav>
      {/* 휴대폰: 4칸씩 두 줄(8개 꽉 차게) · 넓은 화면: 한 줄 */}
      <ul className="grid grid-cols-4 gap-1.5 sm:flex sm:flex-wrap">
        {BOARDS.map((b) => {
          const n = b.type ? (counts[b.type] ?? 0) : 0;
          const Icon = b.icon;
          return (
            <li key={b.href}>
              <Link
                href={b.href}
                className={cn(
                  "touch-target relative flex min-h-10 w-full items-center justify-center gap-1 whitespace-nowrap rounded-full border px-1 text-[12.5px] font-black sm:w-auto sm:px-3.5 sm:text-sm",
                  // 색은 브랜드 3색(검정 · 금 · 적)만: 매장 관리 · 빈자리만 금색으로 돋보이게(예전 TDA 파란색은 빼서 통일)
                  "store" in b && b.store
                      ? "border-[#e7c98a]/80 bg-[#c9a25c]/20 text-[#f3d9a4]"
                      : "hot" in b && b.hot
                        ? "border-[#ffcf4a]/80 bg-[#3a2a0c] text-[#ffe08a]"
                        : "border-[#c9a25c]/40 bg-black/35 text-[#f3e6cf] hover:border-[#c9a25c]",
                )}
              >
                <Icon aria-hidden className="size-4 shrink-0" />
                {b.label}
                {n ? <span className="absolute -top-1.5 -right-0.5 rounded-full bg-[#7a1c22] px-1 text-[10px] leading-4 text-white sm:static sm:px-1.5 sm:text-[11px] sm:leading-normal">+{n}</span> : null}
              </Link>
            </li>
          );
        })}
        <li>
          <Link
            href="/attendance"
            data-home-attendance={user ? (checked ? "done" : "todo") : "guest"}
            className={cn(
              "touch-target relative flex min-h-10 w-full items-center justify-center gap-1 whitespace-nowrap rounded-full border px-1 text-[12.5px] font-black sm:w-auto sm:px-3.5 sm:text-sm",
              user && checked ? "border-emerald-400/60 bg-emerald-500/10 text-emerald-200" : "border-[#ff8a8a]/80 bg-[#7a1c22] text-white",
            )}
          >
            <CalendarCheckIcon aria-hidden className="size-4 shrink-0" />
            {attendLabel}
            {user && !checked ? <span aria-hidden className="absolute -top-0.5 -right-0.5 size-2.5 animate-pulse rounded-full bg-[#ffcf4a]" /> : null}
          </Link>
        </li>
      </ul>
    </nav>
  );
}
