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
    <header className="overflow-x-clip border-b border-white/10 bg-[#07150f] pt-[env(safe-area-inset-top)]">
      <div className="mx-auto grid h-14 max-w-[1320px] grid-cols-[1fr_auto_1fr] items-center gap-2 px-3 sm:h-16 sm:px-5 lg:flex lg:h-[4.5rem] lg:gap-3">
        <div className="flex min-w-0 items-center justify-start gap-1">
          <MobileDrawer profile={profile} />
          <a href="/" className="relative z-20 hidden shrink-0 items-center rounded-2xl lg:flex">
            <PokaLogo onDark />
          </a>
        </div>
        <a href="/" className="relative z-20 flex justify-center lg:hidden">
          <PokaLogo onDark />
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
              className="h-10 w-full rounded-full border border-white/15 bg-white/10 pr-4 pl-9 text-sm text-white outline-none placeholder:text-white/40 focus:border-primary focus:bg-white/15 focus:ring-2 focus:ring-primary/30"
            />
          </label>
        </form>
        <div className="flex min-w-0 items-center justify-end gap-0.5 lg:ml-2 lg:gap-1.5">
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
