import Link from "next/link";
import { MobileDrawer } from "@/components/layout/mobile-drawer";
import { ProfileWidget } from "@/components/layout/profile-widget";
import { PokaLogo } from "@/components/brand/poka-logo";
import { TopNav } from "@/components/layout/top-nav";
import type { ViewerProfile } from "@/lib/profile";

export function SiteHeader({ profile }: { profile: ViewerProfile | null }) {
  return (
    <header className="border-b border-border/80 bg-background/90 pt-[env(safe-area-inset-top)] backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-[1440px] items-center gap-2 px-3 sm:px-4 lg:h-16">
        <MobileDrawer profile={profile} />
        <Link href="/" className="touch-target flex min-h-11 min-w-0 shrink-0 items-center rounded-lg px-1">
          <PokaLogo className="h-9 w-auto sm:h-11" />
          <span className="sr-only">POKA 홈</span>
        </Link>
        <TopNav />
        <div className="ml-auto flex shrink-0 items-center gap-2">
          {profile?.isAdmin ? (
            <Link
              href="/admin/banners"
              className="touch-target hidden min-h-11 items-center rounded-lg px-2 text-sm font-medium hover:bg-muted sm:inline-flex"
            >
              관리
            </Link>
          ) : null}
          <div className="lg:hidden">
            <ProfileWidget profile={profile} variant="compact" />
          </div>
        </div>
      </div>
    </header>
  );
}
