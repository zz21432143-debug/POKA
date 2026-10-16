import Link from "next/link";
import { prisma } from "@/lib/db";
import { todayKstDate } from "@/lib/dates";
import { ttlCache } from "@/lib/ttl-cache";
import { cn } from "cn";

const BOARDS = [
  { href: "/boards/jobs", label: "💼 구인구직", type: "JOBS" },
  { href: "/boards/free", label: "💬 자유", type: "FREE" },
  { href: "/boards/hand-review", label: "🃏 핸드리뷰", type: "HAND_REVIEW" },
  { href: "/boards/tda", label: "📜 TDA 룰", type: "TDA", tda: true },
  { href: "/boards/schedule", label: "🗓 대회일정", type: "SCHEDULE" },
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

/** 홈 맨 위: 게시판 바로가기(아래로 내려가지 않아도 바로) · 오늘 새 글 수 · 최신글로 내려가기 */
export async function HomeBoardNav() {
  const counts = await todayCounts().catch(() => ({}) as Record<string, number>);
  return (
    <nav aria-label="게시판 바로가기" data-home-board-nav>
      {/* 휴대폰: 3칸씩 두 줄(옆으로 밀지 않아도 다 보이게) · 넓은 화면: 한 줄 */}
      <ul className="grid grid-cols-3 gap-1.5 sm:flex sm:flex-wrap">
        {BOARDS.map((b) => {
          const n = counts[b.type] ?? 0;
          return (
            <li key={b.href}>
              <Link
                href={b.href}
                className={cn(
                  "touch-target flex min-h-10 w-full items-center justify-center gap-1 whitespace-nowrap rounded-full border px-2 text-[13px] font-black sm:w-auto sm:px-3.5 sm:text-sm",
                  "tda" in b && b.tda
                    ? "border-[#5aa9ff]/80 bg-[#123a66] text-white"
                    : "border-[#c9a25c]/40 bg-black/35 text-[#f3e6cf] hover:border-[#c9a25c]",
                )}
              >
                {b.label}
                {n ? <span className="rounded-full bg-[#7a1c22] px-1.5 text-[11px] text-white">+{n}</span> : null}
              </Link>
            </li>
          );
        })}
        <li>
          <a href="#home-latest" className="touch-target flex min-h-10 w-full items-center justify-center gap-1 whitespace-nowrap rounded-full border border-white/20 bg-white/10 px-2 text-[13px] font-black text-white sm:w-auto sm:px-3.5 sm:text-sm">
            📰 최신글 ↓
          </a>
        </li>
      </ul>
    </nav>
  );
}
