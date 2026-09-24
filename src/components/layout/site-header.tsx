import type { ReactNode } from "react";
import Link from "next/link";
import { BellIcon, SearchIcon, UserRoundIcon } from "lucide-react";
import { PokaLogo } from "@/components/brand/poka-logo";
import { TopNav } from "@/components/layout/top-nav";
import type { ViewerProfile } from "@/lib/profile";
import type { SwitchAccount } from "@/lib/switch-account";

export function SiteHeader({
  profile,
  noticeCount = 0,
}: {
  profile: ViewerProfile | null;
  accounts?: SwitchAccount[];
  noticeCount?: number;
}) {
  const meHref = profile ? `/u/${encodeURIComponent(profile.nickname)}` : "/me";
  return (
    <header className="border-b border-border bg-[#f7fbf8]">
      <div className="mx-auto flex h-[4.5rem] w-full min-w-[1180px] max-w-[1320px] flex-nowrap items-center gap-3 px-5">
        <Link href="/" className="flex shrink-0 items-center rounded-2xl">
          <PokaLogo />
          <span className="sr-only">POKA 홈</span>
        </Link>
        <TopNav />
        <form action="/search" className="ml-auto flex min-w-0 flex-1 items-center justify-end">
          <label className="relative w-full max-w-sm">
            <span className="sr-only">검색</span>
            <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              name="q"
              placeholder="검색어를 입력하세요."
              className="h-10 w-full rounded-full border border-border bg-white pr-4 pl-9 text-sm outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </label>
        </form>
        <div className="flex shrink-0 items-center gap-1.5">
          <HeaderIcon href="/notifications" label="알림">
            <span className="relative">
              <BellIcon className="size-5" />
              {noticeCount > 0 ? (
                <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-white">
                  {noticeCount > 9 ? "9+" : noticeCount}
                </span>
              ) : null}
            </span>
          </HeaderIcon>
          {profile ? (
            <HeaderIcon href={meHref} label="마이페이지">
              <UserRoundIcon className="size-5" />
              <span>마이페이지</span>
            </HeaderIcon>
          ) : (
            <Link
              href="/login"
              className="inline-flex min-h-11 items-center rounded-full bg-primary px-3 text-sm font-semibold text-white hover:bg-primary/90"
            >
              로그인
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

function HeaderIcon({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-2.5 text-sm font-medium text-foreground hover:bg-muted"
    >
      {children}
    </Link>
  );
}
