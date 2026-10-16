import Link from "@/components/ui/link";
import type { ReactNode } from "react";

/** 사이트 소개 · 운영자 소개 · 문의하기 · 약관 바로가기(바닥글과 각 안내 페이지 아래에 씀) */
export const INFO_PAGES = [
  { href: "/about", label: "사이트 소개" },
  { href: "/operator", label: "운영자 소개" },
  { href: "/contact", label: "문의하기" },
  { href: "/terms", label: "이용약관" },
  { href: "/privacy", label: "개인정보처리방침" },
  { href: "/youth", label: "청소년 보호정책" },
] as const;

export function InfoPage({ title, lead, current, children }: { title: string; lead: string; current: string; children: ReactNode }) {
  return (
    <article className="mx-auto grid w-full max-w-2xl gap-5 text-[15px] leading-7">
      <header className="grid gap-2">
        <h1 className="text-2xl font-black text-white sm:text-3xl">{title}</h1>
        <p className="text-base text-[#d1c7b5]">{lead}</p>
      </header>
      {children}
      <nav aria-label="POKA 안내" className="flex flex-wrap gap-2 border-t border-white/10 pt-4">
        {INFO_PAGES.filter((page) => page.href !== current).map((page) => (
          <Link
            key={page.href}
            href={page.href}
            className="inline-flex min-h-10 items-center rounded-full border border-white/15 px-3.5 text-sm font-bold text-[#d1c7b5] hover:border-[#c9a25c] hover:text-white"
          >
            {page.label}
          </Link>
        ))}
      </nav>
    </article>
  );
}

export function InfoSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="grid gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5">
      <h2 className="text-lg font-black text-[#f3d9a4]">{title}</h2>
      <div className="grid gap-2 text-[#ece4d6]">{children}</div>
    </section>
  );
}
