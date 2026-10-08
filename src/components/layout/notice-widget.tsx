import type { ReactNode } from "react";
import Link from "next/link";
import { Volume2Icon } from "lucide-react";

function NoticeLink({
  href,
  children,
  className,
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  const external = href.startsWith("http://") || href.startsWith("https://");
  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}

export function NoticeWidget({
  items,
}: {
  items: { id: string; title: string; date: string; href: string }[];
}) {
  return (
    <section className="lounge-card rounded-[1.5rem] p-4">
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
              <NoticeLink href={item.href} className="flex items-start justify-between gap-2 text-sm">
                <span className="min-w-0 truncate text-foreground/90 hover:text-primary">
                  · {item.title}
                </span>
                <span className="shrink-0 text-[11px] text-muted-foreground">{item.date}</span>
              </NoticeLink>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
