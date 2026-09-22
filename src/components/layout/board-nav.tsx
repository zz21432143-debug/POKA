"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "cn";
import { BOARD_NAV } from "@/lib/nav";

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
          <p className="mb-1 px-2 text-[11px] font-semibold tracking-wide text-primary uppercase">
            {group.title}
          </p>
          <ul className="flex flex-col gap-1">
            {group.items.map((item) => {
              const active = pathname === item.href;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    className={cn(
                      "touch-target flex min-h-11 items-center justify-between rounded-lg px-3 text-sm transition-colors",
                      active
                        ? "bg-primary/15 font-medium text-primary"
                        : "text-foreground hover:bg-muted",
                    )}
                  >
                    <span>{item.label}</span>
                    <span className="max-w-[46%] truncate text-[11px] text-muted-foreground">
                      {item.hint}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
