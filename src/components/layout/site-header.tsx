import type { ReactNode } from "react";
import Link from "next/link";
import { SearchIcon, UserRoundIcon } from "lucide-react";
import { MobileDrawer } from "@/components/layout/mobile-drawer";
import { InstallPwaButton } from "@/components/pwa/install-pwa-button";
import { PokaLogo } from "@/components/brand/poka-logo";
import { TopNav } from "@/components/layout/top-nav";
import { KakaoOpenChatCta } from "@/components/layout/kakao-open-chat-cta";
import type { ViewerProfile } from "@/lib/profile";

export function SiteHeader({
  profile,
}: {
  profile: ViewerProfile | null;
}) {
  const meHref = profile ? "/account" : "/login";
  return (
    <header className="border-b border-white/10 bg-[#07150f] pt-[env(safe-area-inset-top)]">
      <div className="mx-auto grid h-14 max-w-[1320px] grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-1 px-2 sm:h-16 sm:gap-2 sm:px-5 lg:flex lg:h-[4.5rem] lg:gap-3">
        <div className="relative z-30 flex items-center justify-start">
          <MobileDrawer profile={profile} />
          <a href="/" className="relative z-20 hidden shrink-0 items-center rounded-2xl lg:flex">
            <PokaLogo onDark />
          </a>
        </div>
        <a href="/" className="relative z-0 flex min-w-0 justify-center overflow-hidden lg:hidden">
          <PokaLogo onDark className="max-w-full" />
        </a>
        <TopNav />
        <form action="/search" className="ml-auto hidden min-w-0 flex-1 items-center justify-end lg:flex">
          <label className="relative w-full max-w-sm">
            <span className="sr-only">검색</span>
            <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-white/45" />
            <input
              type="search"
              name="q"
              placeholder="검색어를 입력하세요."
              className="h-10 w-full rounded-full border border-white/30 bg-white/15 pr-4 pl-9 text-sm text-white outline-none placeholder:text-white/70 focus:border-primary focus:bg-white/20 focus:ring-2 focus:ring-primary/30"
            />
          </label>
        </form>
        <div className="relative z-30 flex items-center justify-end gap-0.5 lg:ml-2 lg:gap-1.5">
          <span className="hidden lg:inline-flex">
            <InstallPwaButton compact />
          </span>
          <KakaoOpenChatCta compact />
          <Link
            href="/search"
            aria-label="검색"
            className="inline-flex size-11 items-center justify-center rounded-full text-white/80 hover:bg-white/10 lg:hidden"
          >
            <SearchIcon className="size-5" />
          </Link>
          {profile ? (
            <HeaderIcon href={meHref} label="내 정보">
              <UserRoundIcon className="size-5" />
              <span className="hidden sm:inline lg:inline">내정보</span>
            </HeaderIcon>
          ) : (
            <Link
              href="/login"
              className="inline-flex size-11 items-center justify-center rounded-full bg-primary text-sm font-semibold text-white hover:bg-primary/90 sm:min-h-11 sm:w-auto sm:px-3"
            >
              <UserRoundIcon className="size-5 sm:hidden" />
              <span className="hidden sm:inline">로그인</span>
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
      className="inline-flex size-11 items-center justify-center gap-1.5 rounded-full text-sm font-medium text-white/85 hover:bg-white/10 hover:text-white sm:w-auto sm:min-h-11 sm:px-2.5"
    >
      {children}
    </Link>
  );
}
