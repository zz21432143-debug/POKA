import Link from "next/link";

export function AdminNav({
  current,
  isMaster,
}: {
  current?: string;
  isMaster?: boolean;
}) {
  const links = [
    { href: "/admin?tab=reports", label: "신고 관리" },
    { href: "/admin?tab=sanctions", label: "유저·제재" },
    ...(isMaster
      ? [
          { href: "/admin?tab=words", label: "금지어" },
          { href: "/admin?tab=settings", label: "사이트 설정" },
        ]
      : []),
    { href: "/admin/banners", label: "배너" },
  ];
  return (
    <nav className="flex flex-wrap gap-2">
      {links.map((link) => (
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
