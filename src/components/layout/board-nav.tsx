"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "cn";
import { BOARD_NAV, navGroupActive, navItemActive, type NavGroup } from "@/lib/nav";

function Dot({ accent, active }: { accent: NavGroup["accent"]; active?: boolean }) {
  return (
    <span
      className={cn(
        "size-1.5 shrink-0 rounded-full",
        accent === "gold" ? "bg-[#d4a017]" : "bg-primary",
        active ? "opacity-100" : "opacity-80",
      )}
      aria-hidden
    />
  );
}

export function BoardNav({
  onNavigate,
  id,
}: {
  onNavigate?: () => void;
  id?: string;
}) {
  const pathname = usePathname();

  return (
    <nav id={id} aria-label="전체 게시판" className="flex flex-col gap-5">
      {BOARD_NAV.map((group) => (
        <div key={group.title}>
          {group.items.length === 0 ? (
            <Link
              href={group.href}
              onClick={onNavigate}
              className={cn(
                "touch-target flex min-h-11 items-center gap-2.5 rounded-lg px-3 text-sm font-semibold transition-colors",
                navGroupActive(pathname, group)
                  ? "bg-primary/12 text-primary"
                  : "text-foreground hover:bg-muted",
              )}
            >
              <Dot accent={group.accent} active={navGroupActive(pathname, group)} />
              <span className="min-w-0 flex-1">{group.title}</span>
            </Link>
          ) : (
            <>
              <p className="mb-1 flex items-center gap-2 px-3 text-[11px] font-semibold tracking-wide text-muted-foreground">
                <Dot accent={group.accent} />
                {group.title}
              </p>
              <ul className="flex flex-col gap-1">
                {group.items.map((item) => {
                  const active = navItemActive(pathname, item.href);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={onNavigate}
                        className={cn(
                          "touch-target flex min-h-11 items-center gap-2.5 rounded-lg px-3 text-sm transition-colors",
                          active
                            ? "bg-primary/12 font-medium text-primary"
                            : "text-foreground hover:bg-muted",
                        )}
                      >
                        <Dot accent={group.accent} active={active} />
                        <span className="min-w-0 flex-1">{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>
      ))}
    </nav>
  );
}
