"use client";

import { usePathname } from "next/navigation";
import { ChevronRightIcon } from "lucide-react";
import { cn } from "cn";
import { SIDEBAR_NAV, navItemActive, type SidebarIcon } from "@/lib/nav";

function SealIcon({ kind, active }: { kind: SidebarIcon; active?: boolean }) {
  const gold = active ? "#fff8ee" : "currentColor";
  const red = active ? "#fff8ee" : "currentColor";
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-5 shrink-0">
      {kind === "home" ? (
        <>
          <path fill={gold} d="M12 3.2 3.5 10.2V21h6.2v-6.2h4.6V21H20.5V10.2L12 3.2Z" />
          <path fill={red} d="M10.2 21v-5.2h3.6V21h-3.6Z" />
        </>
      ) : null}
      {kind === "message" ? (
        <>
          <path fill={gold} d="M5 5.5h14a2 2 0 0 1 2 2v7.2a2 2 0 0 1-2 2H9.2L5 20.2V5.5Z" />
          <path fill={red} d="M8.2 9.2h7.6v1.6H8.2zm0 3h5.2v1.6H8.2Z" />
        </>
      ) : null}
      {kind === "camera" ? (
        <>
          <path fill={gold} d="M8 4.5h8l1.2 2.2H20a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8.7a2 2 0 0 1 2-2h2.8L8 4.5Z" />
          <circle cx="12" cy="12.4" r="3.2" fill={red} />
        </>
      ) : null}
      {kind === "briefcase" ? (
        <>
          <path fill={gold} d="M8.2 7.2V6.2A2.2 2.2 0 0 1 10.4 4h3.2a2.2 2.2 0 0 1 2.2 2.2v1H20a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9.2a2 2 0 0 1 2-2h4.2Zm2-1h3.6v1h-3.6v-1Z" />
          <path fill={red} d="M3 12.2h18v1.6H3z" />
        </>
      ) : null}
      {kind === "help" ? (
        <>
          <circle cx="12" cy="12" r="8.2" fill={gold} />
          <path fill={red} d="M9.4 9.6a2.7 2.7 0 1 1 3.5 2.5c-.7.3-1.1.8-1.1 1.6v.5h-1.7v-.8c0-1.3.7-2.1 1.8-2.6a1.2 1.2 0 1 0-1.6-1.1H9.4Zm2 6.2h1.7V17h-1.7v-1.2Z" />
        </>
      ) : null}
      {kind === "spade" ? (
        <>
          <path fill={gold} d="M12 3.2c2.8 3.2 6.4 5.6 6.4 9.1a4.2 4.2 0 0 1-7.2 2.9 4.2 4.2 0 0 1-7.2-2.9c0-3.5 3.6-5.9 6.4-9.1Z" />
          <path fill={red} d="M10.6 15.2h2.8L12 21l-1.4-5.8Z" />
        </>
      ) : null}
      {kind === "lightbulb" ? (
        <>
          <path fill={gold} d="M12 3.2a5.6 5.6 0 0 1 3.2 10.2c-.5.4-.8 1-.8 1.6v.8H9.6v-.8c0-.6-.3-1.2-.8-1.6A5.6 5.6 0 0 1 12 3.2Z" />
          <path fill={red} d="M9.8 17.2h4.4v1.4H9.8zm.6 2.2h3.2V21h-3.2z" />
        </>
      ) : null}
      {kind === "book" ? (
        <>
          <path fill={gold} d="M5 5.2h6.2c1.2 0 2.2.8 2.8 1.6.6-.8 1.6-1.6 2.8-1.6H21V19h-4.2c-1 0-1.8.4-2.3 1h-1c-.5-.6-1.3-1-2.3-1H5V5.2Z" />
          <path fill={red} d="M11.2 7.2h1.6V18h-1.6z" />
        </>
      ) : null}
      {kind === "calendar" ? (
        <>
          <path fill={gold} d="M6 4.5h2V3h1.8v1.5h4.4V3H16v1.5h2A2 2 0 0 1 20 6.5V19a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6.5a2 2 0 0 1 2-2Z" />
          <path fill={red} d="M4 8.6h16v1.7H4zm3.2 4.2h2.2V15H7.2zm3.6 0h2.2V15h-2.2z" />
        </>
      ) : null}
      {kind === "megaphone" ? (
        <>
          <path fill={gold} d="M4 9.2h3.2l8.2-3.6v12.8L7.2 14.8H4a1.4 1.4 0 0 1-1.4-1.4v-2.8A1.4 1.4 0 0 1 4 9.2Z" />
          <path fill={red} d="M6.2 15.2 8 20h2.2l-1.6-4.8H6.2Z" />
        </>
      ) : null}
      {kind === "bell" ? (
        <>
          <path fill={gold} d="M12 3.4a5.4 5.4 0 0 1 5.4 5.4v3.2l1.6 2.6H5l1.6-2.6V8.8A5.4 5.4 0 0 1 12 3.4Z" />
          <path fill={red} d="M9.6 16.4a2.4 2.4 0 0 0 4.8 0H9.6Z" />
        </>
      ) : null}
      {kind === "shield" ? (
        <>
          <path fill={gold} d="M12 3.2 19.5 6v5.6c0 4.2-3 7.2-7.5 8.8-4.5-1.6-7.5-4.6-7.5-8.8V6L12 3.2Z" />
          <path fill={red} d="M12 7.2 15.2 12 12 16.8 8.8 12 12 7.2Z" />
        </>
      ) : null}
      {kind === "badge" ? (
        <>
          <circle cx="12" cy="12" r="7.4" fill={gold} />
          <path fill={red} d="m12 7.4 1.2 2.6 2.8.3-2.1 1.9.6 2.8L12 13.6 9.5 15l.6-2.8-2.1-1.9 2.8-.3L12 7.4Z" />
        </>
      ) : null}
      {kind === "heart" ? <path fill={gold} d="M12 19.2 5.2 12.6a3.8 3.8 0 0 1 5.4-5.4L12 8.6l1.4-1.4a3.8 3.8 0 0 1 5.4 5.4L12 19.2Z" /> : null}
      {kind === "alert" ? (
        <>
          <path fill={gold} d="M12 3.4 21 19.2H3L12 3.4Z" />
          <path fill={red} d="M11.1 9.2h1.8V14h-1.8zm0 5.6h1.8v1.8h-1.8z" />
        </>
      ) : null}
      {kind === "check" ? (
        <>
          <circle cx="12" cy="12" r="8" fill={gold} />
          <path fill={red} d="m7.6 12.2 2.6 2.6 6.2-6.2 1.2 1.2-7.4 7.4-3.8-3.8 1.2-1.2Z" />
        </>
      ) : null}
      {kind === "mask" ? (
        <>
          <path fill={gold} d="M5 6.2h14v8.2a5 5 0 0 1-5 5h-4a5 5 0 0 1-5-5V6.2Z" />
          <path fill={red} d="M8.2 10.2h2.2v2.2H8.2zm5.4 0H16v2.2h-2.4z" />
        </>
      ) : null}
    </svg>
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
  const groups = SIDEBAR_NAV.map((group) => ({
    ...group,
    items: group.items.filter((item) => item.href !== "/"),
  })).filter((group) => group.items.length > 0);
  const homeActive = pathname === "/";

  return (
    <nav id={id} aria-label="전체 게시판" className="flex h-full min-h-0 flex-col">
      <div className="px-3 pt-3">
        <a
          href="/"
          onClick={onNavigate}
          className={cn(
            "touch-target flex min-h-12 items-center gap-2.5 rounded-xl border-0 px-3 text-base font-semibold shadow-none",
            homeActive
              ? "bg-[#8b2222] text-[#f6efe2]"
              : "text-[#ece3d3] hover:bg-[#2a2224] hover:text-[#e7c98a]",
          )}
        >
          <SealIcon kind="home" active={homeActive} />
          <span className="flex-1">홈</span>
          <ChevronRightIcon className="size-4 opacity-80" />
        </a>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-3 py-3">
        {groups.map((group, index) => (
          <div key={group.title ?? `g-${index}`}>
            {group.title ? (
              <p className="mb-2 rounded-lg bg-[#2a2224] px-3 py-1.5 text-sm font-bold text-[#e7c98a]">
                {group.title}
              </p>
            ) : null}
            <ul className="flex flex-col gap-1">
              {group.items.map((item) => {
                const active = navItemActive(pathname, item.href);
                return (
                  <li key={item.href} className="border-0">
                    <a
                      href={item.href}
                      className={cn(
                        "touch-target flex min-h-12 items-center gap-2.5 rounded-xl border-0 px-3 text-base shadow-none transition-colors",
                        active
                          ? "bg-[#8b2222] font-semibold text-[#f6efe2]"
                          : "bg-transparent font-semibold text-[#ece3d3] hover:bg-[#2a2224] hover:text-[#e7c98a]",
                      )}
                      onClick={onNavigate}
                    >
                      <SealIcon kind={item.icon} active={active} />
                      <span className="min-w-0 flex-1">{item.label}</span>
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
      <a
        href="/codex"
        onClick={onNavigate}
        className="m-3 flex items-center gap-3 rounded-2xl bg-[#1e1212] px-3 py-3 hover:bg-[#2a1616]"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/theme/broken-gourd.jpg" alt="" width={56} height={56} className="size-14 shrink-0 rounded-xl object-cover" />
        <p className="text-sm font-bold leading-5 text-[#f3eadb]">
          호리병이 깨졌다!
          <br />
          <span className="font-semibold text-[#d98a7e]">108요괴를 모아보세요</span>
        </p>
      </a>
    </nav>
  );
}
