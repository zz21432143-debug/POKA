import { Suspense, type ReactNode } from "react";
import { SiteFooter, SiteFooterFallback } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
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
import { SectionTabs } from "@/components/layout/section-tabs";
import { AdOffProvider } from "@/components/ads/ad-toggle";
import { getLatestNotices } from "@/lib/notices";
import { nowMs } from "@/lib/dates";
import { VisitBeacon } from "@/components/analytics/visit-beacon";
import { HideOnGames } from "@/components/layout/route-hide";
import { SourceBeacon } from "@/components/analytics/source-beacon";

/** 공지 띠 내용: 관리자 문구 + 최근 2주 공지 */
async function noticeStrip() {
  const [settings, notices] = await Promise.all([getSiteSettings().catch(() => null), getLatestNotices().catch(() => [])]);
  const recent = notices
    .filter((n) => nowMs() - new Date(n.createdAt).getTime() < 14 * 86_400_000)
    .map((n) => ({ text: n.title, href: `/posts/${n.id}` }));
  return { banner: settings?.noticeBanner?.trim() || null, recent };
}

async function ConnectedTicker() {
  const [events, strip] = await Promise.all([getCachedTickerEvents().catch(() => []), noticeStrip()]);
  return (
    <LedTicker
      // 휴대폰: 공지 띠를 따로 두지 않고 여기 섞음 · 앱 받기는 왼쪽 작은 버튼
      notices={[...(strip.banner ? [{ text: strip.banner }] : []), ...strip.recent]}
      leading={<InstallPwaButton variant="chip" />}
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

/**
 * 예전 PC 공지 띠: 위 전광판과 같은 공지가 두 번 나와서(맨 위 줄 3개 → 2개) 이제 전광판에만 섞어 보여 줌.
 * 공지가 하나도 없을 때만 PC에 앱 받기 띠를 둠.
 */
async function ConnectedNotice() {
  const { banner, recent } = await noticeStrip();
  if (!banner && !recent.length) return <div className="hidden sm:block"><InstallPwaButton variant="strip" /></div>;
  return null;
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
      {/* 광고 문의 칸(예전 왼쪽 메뉴 아래) → 모든 화면에서 내용 아래 */}
      <div className="mt-5">
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
      {/* 사이트 메뉴는 위 메뉴 하나(왼쪽 메뉴 없음 · 화면을 넓게). 옆 광고 칸은 광고를 받기 시작하면 다시 정함 */}
      <div className="site-columns mx-auto flex w-full max-w-[1560px] flex-1 items-start gap-4 px-4 py-3 sm:px-5">
        <main className="mobile-nav-pad min-w-0 flex-1 overflow-x-clip lg:pb-6">
          <SectionTabs />
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
