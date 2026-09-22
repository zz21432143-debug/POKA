import Link from "next/link";
import { MobileDrawer } from "@/components/layout/mobile-drawer";
import { ProfileWidget } from "@/components/layout/profile-widget";
import type { ViewerProfile } from "@/lib/profile";

export function SiteHeader({ profile }: { profile: ViewerProfile | null }) {
  return (
    <header className="border-b border-border/80 bg-background/90 pt-[env(safe-area-inset-top)] backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-[1440px] items-center gap-2 px-3 sm:px-4 lg:h-16">
        <MobileDrawer profile={profile} />
        <Link
          href="/"
          className="touch-target flex min-h-11 min-w-0 items-center rounded-lg px-1"
        >
          <span className="text-lg font-bold tracking-[0.28em] text-primary">POKA</span>
        </Link>
        <div className="ml-auto flex items-center gap-2">
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
