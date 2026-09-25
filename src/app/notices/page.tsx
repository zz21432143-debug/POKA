import Link from "next/link";
import { OFFICIAL_NOTICES } from "@/lib/notices";

export const dynamic = "force-dynamic";

export default function NoticesPage() {
  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-2xl font-semibold">공지사항</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          운영 공지입니다. 레벨업·글 작성 소식은 상단 전광판을 보세요.
        </p>
      </header>
      <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-white">
        {OFFICIAL_NOTICES.map((item) => {
          const external = item.href.startsWith("http");
          const className =
            "touch-target flex min-h-14 items-center justify-between gap-3 px-4 py-3 hover:bg-muted/50";
          const body = (
            <>
              <span className="min-w-0 truncate text-sm font-medium">{item.title}</span>
              <span className="shrink-0 text-xs text-muted-foreground">{item.date}</span>
            </>
          );
          return (
            <li key={item.id}>
              {external ? (
                <a href={item.href} target="_blank" rel="noopener noreferrer" className={className}>
                  {body}
                </a>
              ) : (
                <Link href={item.href} className={className}>
                  {body}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
