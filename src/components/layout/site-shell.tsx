import { Suspense, type ReactNode } from "react";
import { BoardNav } from "@/components/layout/board-nav";
import { SiteFooter, SiteFooterFallback } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { SiteNoticeBanner } from "@/components/layout/site-notice-banner";
import { SidebarSponsorCard } from "@/components/ads/sidebar-sponsor-card";
import { FeedAdRow } from "@/components/ads/feed-ad-row";
import { LedTicker } from "@/components/home/led-ticker";
import { InstallPwaButton } from "@/components/pwa/install-pwa-button";
import { getCurrentUser } from "@/lib/current-user";
import { getCachedTickerEvents } from "@/lib/home-data";
import { getSponsorCreative } from "@/lib/inventory";
import { getSiteSettings } from "@/lib/site-settings";
import { headers } from "next/headers";
import { CrownProvider } from "@/components/honor/crowned-frame";
import { VisitBeacon } from "@/components/analytics/visit-beacon";

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
      <div className="mt-5 lg:hidden">
        <ConnectedSidebarSponsor />
      </div>
    </>
  );
}

export function SiteShell({ children }: { children: ReactNode }) {
  return (
    <CrownProvider>
    <div className="felt-bg flex min-h-dvh flex-col">
      <div className="sticky top-0 z-40 bg-[#120d0a] shadow-[0_6px_18px_rgb(0_0_0/0.35)]">
        <Suspense fallback={<SiteHeader profile={null} />}>
          <ConnectedHeader />
        </Suspense>
        <Suspense fallback={<LedTicker items={[]} />}>
          <ConnectedTicker />
        </Suspense>
      </div>
      {/* 휴대폰 전용 앱 다운로드 띠. 고정(sticky) 영역 밖에 두어 헤더·전광판과 겹치지 않고 스크롤하면 사라집니다. */}
      <InstallPwaButton variant="strip" />
      <VisitBeacon />
      <Suspense fallback={null}>
        <ConnectedNotice />
      </Suspense>
      <div className="site-columns mx-auto flex w-full max-w-[1320px] flex-1 items-start gap-5 px-3 py-5 sm:px-6">
        <aside className="hidden w-[16rem] shrink-0 lg:flex lg:flex-col lg:gap-3">
          <div className="wood-frame flex flex-col">
            <BoardNav />
          </div>
          {/* 사이드 광고 자리(모든 페이지): 팔리면 배너, 비어 있으면 '광고 문의' 작은 칸 */}
          <Suspense fallback={null}>
            <ConnectedSidebarSponsor />
          </Suspense>
        </aside>
        <main className="mobile-nav-pad min-w-0 flex-1 overflow-x-clip lg:pb-6">
          {children}
          <Suspense fallback={null}>
            <ConnectedFeedAds />
          </Suspense>
        </main>
      </div>
      <Suspense fallback={<SiteFooterFallback />}>
        <SiteFooter />
      </Suspense>
      <MobileBottomNav />
    </div>
    </CrownProvider>
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
