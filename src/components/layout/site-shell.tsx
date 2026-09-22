import type { ReactNode } from "react";
import { BoardNav } from "@/components/layout/board-nav";
import { ProfileWidget } from "@/components/layout/profile-widget";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { PopularPosts } from "@/components/layout/popular-posts";
import { AdSlot } from "@/components/ads/ad-slot";
import { LedTicker } from "@/components/home/led-ticker";
import { getViewerProfile } from "@/lib/profile";
import { ensureTodayAttendancePost } from "@/lib/attendance";
import { getTickerEvents } from "@/lib/ticker";

export async function SiteShell({ children }: { children: ReactNode }) {
  let profile = null;
  let ticker: { id: string; message: string; href: string }[] = [];
  try {
    await ensureTodayAttendancePost();
    const [viewer, events] = await Promise.all([getViewerProfile(), getTickerEvents()]);
    profile = viewer;
    ticker = events.map((event) => ({
      id: event.id,
      message: event.message,
      href: event.href,
    }));
  } catch {
    profile = null;
  }

  return (
    <div className="felt-bg flex min-h-dvh flex-col">
      <div className="sticky top-0 z-40 [transform:translateZ(0)]">
        <SiteHeader profile={profile} />
        <LedTicker items={ticker} />
      </div>
      <div className="mx-auto flex w-full max-w-[1440px] flex-1 items-start gap-0 lg:gap-4 lg:px-4">
        <aside className="sticky top-[8.25rem] hidden h-[calc(100dvh-8.25rem)] w-60 shrink-0 overflow-y-auto py-4 lg:block">
          <BoardNav />
        </aside>
        <main className="min-w-0 flex-1 px-3 py-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-4">
          {children}
        </main>
        <aside className="sticky top-[8.25rem] hidden h-[calc(100dvh-8.25rem)] w-60 shrink-0 py-4 lg:flex">
          <div className="flex h-full min-h-0 w-full flex-col gap-4">
            <ProfileWidget profile={profile} />
            <PopularPosts />
            <AdSlot placement="sidebar" />
          </div>
        </aside>
      </div>
      <SiteFooter />
    </div>
  );
}
