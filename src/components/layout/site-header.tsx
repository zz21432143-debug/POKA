import type { ReactNode } from "react";
import Link from "next/link";
import { BellIcon, ShieldIcon, UserRoundIcon } from "lucide-react";
import { MobileDrawer } from "@/components/layout/mobile-drawer";
import { PokaLogo } from "@/components/brand/poka-logo";
import type { ViewerProfile } from "@/lib/profile";

export function SiteHeader({ profile }: { profile: ViewerProfile | null }) {
  const meHref = profile ? `/u/${encodeURIComponent(profile.nickname)}` : "/me";
  return (
    <header className="border-b border-border/80 bg-background/90 pt-[env(safe-area-inset-top)] backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-2 px-3 sm:h-[4.5rem] sm:px-4 lg:h-20">
        <MobileDrawer profile={profile} />
        <Link href="/" className="touch-target flex min-h-11 min-w-0 items-center rounded-lg px-1">
          <PokaLogo className="h-12 w-auto sm:h-14 lg:h-16" />
          <span className="sr-only">POKA 홈</span>
        </Link>
        <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
          <HeaderIcon href={meHref} label="마이페이지">
            <UserRoundIcon className="size-5" />
            <span className="hidden sm:inline">마이페이지</span>
          </HeaderIcon>
          <HeaderIcon href="/notifications" label="알림">
            <BellIcon className="size-5" />
            <span className="hidden sm:inline">알림</span>
          </HeaderIcon>
          {profile?.isAdmin ? (
            <HeaderIcon href="/admin/banners" label="관리">
              <ShieldIcon className="size-5" />
              <span className="hidden sm:inline">관리</span>
            </HeaderIcon>
          ) : null}
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
      className="touch-target inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium text-foreground hover:bg-muted hover:text-primary"
    >
      {children}
    </Link>
  );
}
