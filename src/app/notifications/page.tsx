import Link from "next/link";
import { getTickerEvents } from "@/lib/ticker";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const events = await getTickerEvents().catch(() => []);
  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-2xl font-semibold">알림</h1>
        <p className="mt-1 text-sm text-muted-foreground">레벨, 출석, 인기글 등 최근 활동입니다.</p>
      </header>
      {events.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
          새 알림이 없습니다.
        </p>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
          {events.map((event) => (
            <li key={event.id}>
              <Link href={event.href} className="touch-target block min-h-12 px-3 py-3 hover:bg-muted/60">
                <p className="text-sm">{event.message}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
