import Link from "next/link";
import { getTickerEvents } from "@/lib/ticker";
import { formatRelativeKst } from "@/lib/dates";

export const dynamic = "force-dynamic";

const FALLBACK = [
  { id: "1", message: "게시판 이용 규칙 안내", href: "/terms", createdAt: new Date("2026-04-10") },
  { id: "2", message: "운영진 가입 안내 공지", href: "/about", createdAt: new Date("2026-04-05") },
  { id: "3", message: "포카 커뮤니티 이벤트 안내", href: "/boards/schedule", createdAt: new Date("2026-03-28") },
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
