import Link from "next/link";
import { MobileDrawer } from "@/components/layout/mobile-drawer";
import { ProfileWidget } from "@/components/layout/profile-widget";
import type { ViewerProfile } from "@/lib/profile";

export function SiteHeader({ profile }: { profile: ViewerProfile | null }) {
  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/90 pt-[env(safe-area-inset-top)] backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-[1440px] items-center gap-3 px-3 sm:px-4 lg:h-16">
        <MobileDrawer profile={profile} />
        <Link
          href="/"
          className="touch-target flex min-h-11 min-w-0 items-center gap-2 rounded-lg px-1"
        >
          <span className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">
            Felt
          </span>
          <span className="truncate text-base font-semibold">펠트클럽</span>
        </Link>
        <div className="ml-auto lg:hidden">
          <ProfileWidget profile={profile} variant="compact" />
        </div>
        <p className="ml-auto hidden text-sm text-muted-foreground lg:block">
          포커 · 딜러 커뮤니티
        </p>
      </div>
    </header>
  );
}
