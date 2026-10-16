import Link from "@/components/ui/link";
import { INFO_PAGES } from "@/components/legal/info-page";

/** 바닥글 안내 링크: 검색·광고 심사에서 읽을 수 있게 팝업 대신 실제 페이지로 연결합니다. */
export function FooterLegalLinks() {
  return (
    <nav aria-label="POKA 안내" className="flex flex-wrap items-center gap-x-3 gap-y-1 sm:justify-end">
      {INFO_PAGES.map((page) => (
        <Link
          key={page.href}
          href={page.href}
          className={`inline-flex min-h-10 items-center text-sm hover:text-foreground ${page.href === "/privacy" ? "font-bold text-[#e7c98a]" : "text-muted-foreground"}`}
        >
          {page.label}
        </Link>
      ))}
    </nav>
  );
}
