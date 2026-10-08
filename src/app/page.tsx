import { Suspense } from "react";
import { PromoBanners } from "@/components/home/promo-banners";
import { HomeShortcuts } from "@/components/home/home-shortcuts";
import { HomeHeroBanner } from "@/components/home/home-hero-banner";
import { HomeLatest } from "@/components/home/home-latest";
import { HomeUrgentJobs } from "@/components/home/home-urgent-jobs";
import { GrowthHomePanel } from "@/components/home/growth-home-panel";
import { VerifiedDealerStrip } from "@/components/home/verified-dealer-strip";
import { todayKstDate } from "@/lib/dates";
import { getHomeFeed } from "@/lib/home-data";

function HomePanelFallback({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-2xl bg-white/80 ${className}`} />;
}

async function HomeFeedSections() {
      const feed = await getHomeFeed().catch(() => ({
    all: [],
    free: [],
    jobs: [],
    hands: [],
    urgent: [],
    nativeSponsor: null,
    hand: null,
    hub: null,
    dealers: [],
  }));
  const today = todayKstDate();
  return (
    <>
      <HomeLatest
        all={feed.all}
        free={feed.free}
        jobs={feed.jobs}
        hands={feed.hands}
        nativeSponsor={feed.nativeSponsor}
      />
      <HomeUrgentJobs jobs={feed.urgent} />
      <GrowthHomePanel today={today} hand={feed.hand} hub={feed.hub} />
      <VerifiedDealerStrip dealers={feed.dealers} />
    </>
  );
}

export default async function HomePage() {
  return (
    <div className="flex flex-col gap-5">
      <HomeHeroBanner />
      <HomeShortcuts />
      <Suspense
        fallback={
          <div className="flex flex-col gap-5">
            <HomePanelFallback className="h-72" />
            <HomePanelFallback className="h-28" />
            <HomePanelFallback className="h-40" />
          </div>
        }
      >
        <HomeFeedSections />
      </Suspense>
      <Suspense fallback={<HomePanelFallback className="h-64" />}>
        <PromoBanners />
      </Suspense>
    </div>
  );
}
