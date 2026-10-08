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
              className="h-10 w-full rounded-full border border-white/15 bg-black/25 pr-4 pl-9 text-sm text-white outline-none placeholder:text-white/55 focus:border-emerald-300/40 focus:bg-black/35 focus:ring-2 focus:ring-emerald-400/20"
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
            <Link
              href={meHref}
              aria-label="내 정보"
              className="inline-flex size-11 items-center justify-center gap-1.5 rounded-full border border-[#e8c36a]/70 bg-[#f4ead0] text-sm font-semibold text-[#0d3b24] hover:bg-[#fff6d6] sm:min-h-11 sm:w-auto sm:px-3"
            >
              <UserRoundIcon className="size-4" />
              <span className="hidden sm:inline">내정보</span>
            </Link>
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
