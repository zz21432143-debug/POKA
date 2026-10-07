import type { ReactNode } from "react";
import { BoardNav } from "@/components/layout/board-nav";
import { ProfileWidget } from "@/components/layout/profile-widget";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { PopularPosts } from "@/components/layout/popular-posts";
import { NoticeWidget } from "@/components/layout/notice-widget";
import { KakaoOpenChatCta } from "@/components/layout/kakao-open-chat-cta";
import { PromoApplyCta } from "@/components/layout/promo-apply-cta";
import { SidebarSponsorCard } from "@/components/ads/sidebar-sponsor-card";
import { FeedAdRow } from "@/components/ads/feed-ad-row";
import { GoogleAdUnit } from "@/components/ads/google-ad-unit";
import { LedTicker } from "@/components/home/led-ticker";
import { getViewerProfile } from "@/lib/profile";
import { listSwitchableUsers } from "@/lib/current-user";
import { ensureTodayAttendancePost } from "@/lib/attendance";
import { ensureWeeklyScheduleHub } from "@/lib/growth-ops";
import { getTickerEvents } from "@/lib/ticker";
import { getSponsorCreative } from "@/lib/inventory";
import { OFFICIAL_NOTICES } from "@/lib/notices";
import { headers } from "next/headers";

export async function SiteShell({ children }: { children: ReactNode }) {
  let profile = null;
  let accounts: Awaited<ReturnType<typeof listSwitchableUsers>> = [];
  let ticker: { id: string; message: string; href: string }[] = [];
  let sidebarSponsor = null as Awaited<ReturnType<typeof getSponsorCreative>>;
  const pathname = (await headers()).get("x-pathname") ?? "";
  try {
    const [viewer, events, sidebar] = await Promise.all([
      getViewerProfile(),
      getTickerEvents(),
      getSponsorCreative("SIDEBAR").catch(() => null),
      ensureTodayAttendancePost().catch(() => null),
      ensureWeeklyScheduleHub().catch(() => null),
    ]);
    profile = viewer;
    accounts = viewer?.isAdmin ? await listSwitchableUsers().catch(() => []) : [];
    sidebarSponsor = sidebar;
    ticker = events.map((event) => ({
      id: event.id,
      message: event.message,
      href: event.href,
    }));
  } catch {
    profile = null;
  }

  const showFeedAds = shouldShowFeedAds(pathname);

  return (
    <div className="felt-bg flex min-h-dvh flex-col">
      <div className="sticky top-0 z-40 bg-[#07150f]">
        <SiteHeader profile={profile} accounts={accounts} noticeCount={0} />
        <LedTicker items={ticker} />
      </div>
      <div className="mx-auto flex w-full max-w-[1320px] flex-1 items-start gap-5 px-3 py-5 sm:px-5">
        <aside className="sticky top-[7.25rem] hidden h-[calc(100dvh-7.5rem)] w-[15.5rem] shrink-0 overflow-y-auto rounded-2xl border border-border bg-white p-3 shadow-sm lg:block">
          <BoardNav />
        </aside>
        <main className="min-w-0 flex-1 pb-6">
          {children}
          {showFeedAds ? <FeedAdRow /> : null}
          {showFeedAds ? (
            <div className="mt-5 xl:hidden">
              <SidebarSponsorCard unit={sidebarSponsor} />
            </div>
          ) : null}
        </main>
        <aside className="sticky top-[7.25rem] hidden h-[calc(100dvh-7.5rem)] w-[18.5rem] shrink-0 overflow-y-auto xl:flex">
          <div className="flex w-full flex-col gap-3 pb-6">
            <KakaoOpenChatCta />
            <ProfileWidget profile={profile} accounts={accounts} />
            <SidebarSponsorCard unit={sidebarSponsor} />
            <PromoApplyCta />
            <NoticeWidget items={OFFICIAL_NOTICES} />
            <PopularPosts />
            <GoogleAdUnit placement="sidebar" />
          </div>
        </aside>
      </div>
      <SiteFooter />
    </div>
  );
}

function shouldShowFeedAds(pathname: string) {
  if (!pathname) return true;
  if (pathname === "/") return true;
  if (pathname.startsWith("/community")) return true;
  if (pathname.startsWith("/issues")) return true;
  if (pathname.startsWith("/attendance")) return true;
  if (pathname.startsWith("/search")) return true;
  if (pathname.startsWith("/boards") && !pathname.includes("/write")) return true;
  return false;
}
