import Link from "next/link";

const LINKS = [
  { href: "/admin", label: "대시보드" },
  { href: "/admin?tab=reports", label: "신고 관리" },
  { href: "/admin?tab=sanctions", label: "제재 및 정지" },
  { href: "/admin/banners", label: "배너" },
];

export function AdminNav({ current }: { current?: string }) {
  return (
    <nav className="flex flex-wrap gap-2">
      {LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={
            current === link.href
              ? "inline-flex min-h-11 items-center rounded-full bg-primary px-3 text-sm font-semibold text-primary-foreground"
              : "inline-flex min-h-11 items-center rounded-full border border-border px-3 text-sm font-semibold hover:bg-muted"
          }
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
