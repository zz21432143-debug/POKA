import { Suspense, type ReactNode } from "react";
import { BoardNav } from "@/components/layout/board-nav";
import { ProfileWidget } from "@/components/layout/profile-widget";
import { SiteFooter, SiteFooterFallback } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { SiteNoticeBanner } from "@/components/layout/site-notice-banner";
import { PopularPosts } from "@/components/layout/popular-posts";
import { NoticeWidget } from "@/components/layout/notice-widget";
import { KakaoOpenChatCta } from "@/components/layout/kakao-open-chat-cta";
import { PromoApplyCta } from "@/components/layout/promo-apply-cta";
import { SidebarSponsorCard } from "@/components/ads/sidebar-sponsor-card";
import { FeedAdRow } from "@/components/ads/feed-ad-row";
import { GoogleAdUnit } from "@/components/ads/google-ad-unit";
import { LedTicker } from "@/components/home/led-ticker";
import { getCurrentUser } from "@/lib/current-user";
import { getCachedTickerEvents } from "@/lib/home-data";
import { getSponsorCreative } from "@/lib/inventory";
import { OFFICIAL_NOTICES } from "@/lib/notices";
import { getSiteSettings } from "@/lib/site-settings";
import { headers } from "next/headers";

async function ConnectedTicker() {
  const events = await getCachedTickerEvents().catch(() => []);
  return (
    <LedTicker
      items={events.map((event) => ({
        id: event.id,
        message: event.message,
        href: event.href,
      }))}
    />
  );
}

async function ConnectedHeader() {
  const profile = await getCurrentUser().catch(() => null);
  return <SiteHeader profile={profile} />;
}

async function ConnectedNotice() {
  const settings = await getSiteSettings().catch(() => null);
  return <SiteNoticeBanner text={settings?.noticeBanner} />;
}

async function ConnectedProfile() {
  const profile = await getCurrentUser().catch(() => null);
  return <ProfileWidget profile={profile} />;
}

async function ConnectedSidebarSponsor() {
  const sidebarSponsor = await getSponsorCreative("SIDEBAR").catch(() => null);
  return <SidebarSponsorCard unit={sidebarSponsor} />;
}

async function ConnectedFeedAds() {
  let pathname = "";
  try {
    pathname = (await headers()).get("x-pathname") ?? "";
  } catch {
    pathname = "";
  }
  if (!shouldShowFeedAds(pathname)) return null;
  return (
    <>
      <FeedAdRow />
      <div className="mt-5 xl:hidden">
        <ConnectedSidebarSponsor />
      </div>
    </>
  );
}

export function SiteShell({ children }: { children: ReactNode }) {
  return (
    <div className="felt-bg flex min-h-dvh flex-col">
      <div className="sticky top-0 z-40 bg-[#0d2b1e]">
        <Suspense fallback={<SiteHeader profile={null} />}>
          <ConnectedHeader />
        </Suspense>
        <Suspense fallback={<LedTicker items={[]} />}>
          <ConnectedTicker />
        </Suspense>
      </div>
      <Suspense fallback={null}>
        <ConnectedNotice />
      </Suspense>
      <div className="mx-auto flex w-full max-w-[1320px] flex-1 items-start gap-5 px-3 py-5 sm:px-5">
        <aside className="sticky top-[7.25rem] hidden h-[calc(100dvh-7.5rem)] w-[16rem] shrink-0 lg:block">
          <div className="wood-frame flex h-full flex-col">
            <BoardNav />
          </div>
        </aside>
        <main className="mobile-nav-pad min-w-0 flex-1 overflow-x-clip lg:pb-6">
          {children}
          <Suspense fallback={null}>
            <ConnectedFeedAds />
          </Suspense>
        </main>
        <aside className="sticky top-[7.25rem] hidden h-[calc(100dvh-7.5rem)] w-[18.5rem] shrink-0 overflow-y-auto xl:flex">
          <div className="flex w-full flex-col gap-3 pb-6">
            <KakaoOpenChatCta />
            <Suspense fallback={<ProfileWidget profile={null} />}>
              <ConnectedProfile />
            </Suspense>
            <Suspense fallback={null}>
              <ConnectedSidebarSponsor />
            </Suspense>
            <PromoApplyCta />
            <NoticeWidget items={OFFICIAL_NOTICES} />
            <Suspense fallback={null}>
              <PopularPosts />
            </Suspense>
            <GoogleAdUnit placement="sidebar" />
          </div>
        </aside>
      </div>
      <Suspense fallback={<SiteFooterFallback />}>
        <SiteFooter />
      </Suspense>
      <MobileBottomNav />
    </div>
  );
}

function shouldShowFeedAds(pathname: string) {
  if (!pathname) return true;
  if (pathname === "/") return true;
  if (pathname.startsWith("/community")) return true;
  if (pathname.startsWith("/attendance")) return true;
  if (pathname.startsWith("/search")) return true;
  if (pathname.startsWith("/boards") && !pathname.includes("/write")) return true;
  return false;
}
