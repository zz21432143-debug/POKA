import Link from "next/link";
import { Volume2Icon } from "lucide-react";

export function NoticeWidget({
  items,
}: {
  items: { id: string; title: string; date: string; href: string }[];
}) {
  return (
    <section className="rounded-2xl border border-border bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-sm font-semibold">
          <Volume2Icon className="size-4 text-primary" />
          공지사항
        </p>
        <Link href="/notices" className="text-xs text-muted-foreground hover:text-primary">
          더보기
        </Link>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">등록된 공지가 없습니다.</p>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {items.map((item) => (
            <li key={item.id}>
              <Link href={item.href} className="flex items-start justify-between gap-2 text-sm">
                <span className="min-w-0 truncate text-foreground/90 hover:text-primary">
                  · {item.title}
                </span>
                <span className="shrink-0 text-[11px] text-muted-foreground">{item.date}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
