import Link from "next/link";
import { PokaLogo } from "@/components/brand/poka-logo";

const LINKS = [
  { href: "/about", label: "사이트 소개" },
  { href: "/plan", label: "게시판 기획" },
  { href: "/terms", label: "이용약관" },
  { href: "/privacy", label: "개인정보처리방침" },
] as const;

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border bg-white pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div className="mx-auto flex max-w-[1320px] flex-col gap-3 px-3 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="flex items-center gap-3">
          <PokaLogo compact />
          <p className="text-sm text-muted-foreground">홀덤·딜러 커뮤니티</p>
        </div>
        <nav aria-label="약관 및 소개" className="flex flex-wrap gap-x-4 gap-y-2">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="touch-target inline-flex min-h-11 items-center text-sm text-muted-foreground hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
