import { Suspense, type ReactNode } from "react";
import { BoardNav } from "@/components/layout/board-nav";
import { SiteFooter, SiteFooterFallback } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { SiteNoticeBanner } from "@/components/layout/site-notice-banner";
import { SidebarSponsorCard } from "@/components/ads/sidebar-sponsor-card";
import { FeedAdRow } from "@/components/ads/feed-ad-row";
import { GoogleAdUnit } from "@/components/ads/google-ad-unit";
import { LedTicker } from "@/components/home/led-ticker";
import { InstallPwaButton } from "@/components/pwa/install-pwa-button";
import { getCurrentUser } from "@/lib/current-user";
import { getCachedTickerEvents } from "@/lib/home-data";
import { getSponsorCreative } from "@/lib/inventory";
import { getSiteSettings } from "@/lib/site-settings";
import { headers } from "next/headers";
import { CrownProvider } from "@/components/honor/crowned-frame";
import { SidebarRail } from "@/components/layout/sidebar-rail";
import { AdOffProvider } from "@/components/ads/ad-toggle";
import { getLatestNotices } from "@/lib/notices";
import { nowMs } from "@/lib/dates";
import { VisitBeacon } from "@/components/analytics/visit-beacon";
import { HideOnGames } from "@/components/layout/route-hide";
import { SourceBeacon } from "@/components/analytics/source-beacon";

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

/** 닉네임 강제 변경 안내(본인에게만 · 확인하면 사라짐) */
async function ConnectedNickNotice() {
  const user = await getCurrentUser().catch(() => null);
  if (!user) return null;
  const { autoFixBadNickname, pendingNickNotice } = await import("@/lib/nickname-force");
  // 지금 닉네임이 금지어에 걸리면 접속하자마자 바른닉네임으로(안내 창이 아래에서 바로 뜸)
  await autoFixBadNickname(user).catch(() => false);
  const notice = await pendingNickNotice(user.id).catch(() => null);
  if (!notice) return null;
  const { NickNotice } = await import("@/components/layout/nick-notice");
  return <NickNotice from={notice.from} to={notice.to} reason={notice.reason} />;
}

async function ConnectedNotice() {
  const [settings, notices] = await Promise.all([getSiteSettings().catch(() => null), getLatestNotices().catch(() => [])]);
  // 최근 2주 공지는 띠에서 돌려 보여 줌(말머리 태그 포함)
  const recent = notices
    .filter((n) => nowMs() - new Date(n.createdAt).getTime() < 14 * 86_400_000)
    .map((n) => ({ text: n.title, href: `/posts/${n.id}` }));
  // 공지가 있으면 앱 받기는 공지 띠 안 작은 버튼으로(휴대폰 첫 화면 띠를 하나로) · 없으면 앱 받기 띠
  if (!settings?.noticeBanner?.trim() && !recent.length) return <InstallPwaButton variant="strip" />;
  return <SiteNoticeBanner text={settings?.noticeBanner} items={recent} leading={<InstallPwaButton variant="chip" />} />;
}

/** 관리자가 끈 광고 구좌를 광고 칸에 알려 줌 */
async function ConnectedAdOff({ children }: { children: ReactNode }) {
  const settings = await getSiteSettings().catch(() => null);
  return (
    <AdOffProvider off={settings?.adsOff ?? []} slots={settings?.adsSlots ?? {}}>
      {children}
    </AdOffProvider>
  );
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
      <div className="site-top sticky top-0 z-40 bg-[#120d0a] shadow-[0_6px_18px_rgb(0_0_0/0.35)]">
        <Suspense fallback={<SiteHeader profile={null} />}>
          <ConnectedHeader />
        </Suspense>
        <HideOnGames>
          <Suspense fallback={<LedTicker items={[]} />}>
            <ConnectedTicker />
          </Suspense>
        </HideOnGames>
      </div>
      <VisitBeacon />
      <SourceBeacon />
      <HideOnGames>
        <Suspense fallback={null}>
          <ConnectedNotice />
        </Suspense>
      </HideOnGames>
      <Suspense fallback={null}>
        <ConnectedNickNotice />
      </Suspense>
      <ConnectedAdOff>
      <div className="site-columns mx-auto flex w-full max-w-[1560px] flex-1 items-start gap-4 px-4 py-3 sm:px-5">
        <SidebarRail>
          <div className="wood-frame flex flex-col">
            <BoardNav />
          </div>
          {/* 사이드 광고 자리(모든 페이지): 팔리면 배너, 비어 있으면 '광고 문의' 작은 칸 */}
          <Suspense fallback={null}>
            <ConnectedSidebarSponsor />
          </Suspense>
          {/* 구글 사이드 광고: 스크롤해도 화면에 남음(단위가 안 정해졌으면 안 보임) */}
          <div className="sticky top-24">
            <GoogleAdUnit placement="sidebar" media="(min-width: 1024px)" />
          </div>
        </SidebarRail>
        <main className="mobile-nav-pad min-w-0 flex-1 overflow-x-clip lg:pb-6">
          {children}
          <Suspense fallback={null}>
            <ConnectedFeedAds />
          </Suspense>
        </main>
      </div>
      </ConnectedAdOff>
      <Suspense fallback={<SiteFooterFallback />}>
        <SiteFooter />
      </Suspense>
      <HideOnGames>
        <MobileBottomNav />
      </HideOnGames>
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
