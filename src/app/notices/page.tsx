import { getTickerEvents } from "@/lib/ticker";
import { formatRelativeKst } from "@/lib/dates";

export const dynamic = "force-dynamic";

const FALLBACK = [
  { id: "1", message: "홀덤 핸드리뷰 · 구인 · 대회 일정을 한곳에서", href: "/about", createdAt: new Date("2026-09-22") },
  { id: "2", message: "POKA 공식 오픈채팅방 참여하기", href: "https://open.kakao.com/o/gewUD9jc", createdAt: new Date("2026-09-22") },
  { id: "3", message: "인증 딜러는 골드 뱃지로 표시됩니다", href: "/info/dealers", createdAt: new Date("2026-09-22") },
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
            <a
              href={row.href}
              {...(row.href.startsWith("http")
                ? { target: "_blank", rel: "noopener noreferrer" }
                : {})}
              className="touch-target flex min-h-14 items-center justify-between gap-3 px-4 py-3 hover:bg-muted/50"
            >
              <span className="min-w-0 truncate text-sm font-medium">{row.message}</span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {"createdAt" in row && row.createdAt
                  ? formatRelativeKst(row.createdAt.toISOString())
                  : ""}
              </span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
