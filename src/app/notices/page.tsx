import Link from "next/link";
import { getTickerEvents } from "@/lib/ticker";
import { formatRelativeKst } from "@/lib/dates";

export const dynamic = "force-dynamic";

const FALLBACK = [
  { id: "1", message: "POKA는 홀덤만 다룹니다. 바카라·카지노 글은 받지 않습니다.", href: "/about", createdAt: new Date("2026-09-22") },
  { id: "2", message: "POKA 공식 오픈채팅방 참여하기", href: "https://open.kakao.com/o/gewUD9jc", createdAt: new Date("2026-09-22") },
  { id: "3", message: "인증 딜러는 주 1회 핸드리뷰 또는 현장 스케치", href: "/info/dealers", createdAt: new Date("2026-09-22") },
];

export default async function NoticesPage() {
  const events = await getTickerEvents().catch(() => []);
  const rows = events.length > 0 ? events : FALLBACK;

  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-2xl font-semibold">공지사항</h1>
        <p className="mt-1 text-sm text-muted-foreground">운영 공지와 커뮤니티 알림입니다.</p>
      </header>
      <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-white">
        {rows.map((row) => (
          <li key={row.id}>
            <Link href={row.href} className="touch-target flex min-h-14 items-center justify-between gap-3 px-4 py-3 hover:bg-muted/50">
              <span className="min-w-0 truncate text-sm font-medium">{row.message}</span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {"createdAt" in row && row.createdAt
                  ? formatRelativeKst(row.createdAt.toISOString())
                  : ""}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
