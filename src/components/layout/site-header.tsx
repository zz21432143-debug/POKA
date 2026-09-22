import type { ReactNode } from "react";
import Link from "next/link";
import { BellIcon, SearchIcon, UserRoundIcon } from "lucide-react";
import { MobileDrawer } from "@/components/layout/mobile-drawer";
import { PokaLogo } from "@/components/brand/poka-logo";
import { TopNav } from "@/components/layout/top-nav";
import { KakaoOpenChatCta } from "@/components/layout/kakao-open-chat-cta";
import type { ViewerProfile } from "@/lib/profile";
import type { SwitchAccount } from "@/lib/switch-account";

export function SiteHeader({
  profile,
  accounts = [],
  noticeCount = 0,
}: {
  profile: ViewerProfile | null;
  accounts?: SwitchAccount[];
  noticeCount?: number;
}) {
  const meHref = profile ? `/u/${encodeURIComponent(profile.nickname)}` : "/me";
  return (
    <header className="border-b border-border bg-white pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex h-16 max-w-[1320px] items-center gap-3 px-3 sm:h-[4.25rem] sm:px-5">
        <MobileDrawer profile={profile} accounts={accounts} />
        <Link href="/" className="touch-target flex min-h-11 shrink-0 items-center rounded-lg pr-2">
          <PokaLogo className="text-[1.55rem] sm:text-[1.7rem]" />
          <span className="sr-only">POKA 홈</span>
        </Link>
        <TopNav />
        <form action="/search" className="ml-auto hidden min-w-0 flex-1 items-center justify-end lg:flex">
          <label className="relative w-full max-w-sm">
            <span className="sr-only">검색</span>
            <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              name="q"
              placeholder="검색어를 입력하세요."
              className="h-10 w-full rounded-full border border-border bg-muted/60 pr-4 pl-9 text-sm outline-none placeholder:text-muted-foreground focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20"
            />
          </label>
        </form>
        <div className="ml-auto flex shrink-0 items-center gap-1.5 lg:ml-2">
          <span className="xl:hidden">
            <KakaoOpenChatCta compact />
          </span>
          <Link
            href="/search"
            aria-label="검색"
            className="touch-target inline-flex size-11 items-center justify-center rounded-full text-muted-foreground hover:bg-muted lg:hidden"
          >
            <SearchIcon className="size-5" />
          </Link>
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
          <HeaderIcon href={meHref} label="마이페이지">
            <UserRoundIcon className="size-5" />
            <span className="hidden sm:inline">마이페이지</span>
          </HeaderIcon>
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
      className="touch-target inline-flex min-h-11 items-center gap-1.5 rounded-full px-2.5 text-sm font-medium text-foreground hover:bg-muted"
    >
      {children}
    </Link>
  );
}
