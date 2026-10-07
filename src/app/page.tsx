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
    issues: [],
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
        issues={feed.issues}
        nativeSponsor={feed.nativeSponsor}
      />
      <HomeUrgentJobs jobs={feed.urgent} />
      <GrowthHomePanel today={today} hand={feed.hand} hub={feed.hub} />
      <VerifiedDealerStrip dealers={feed.dealers} />
    </>
  );
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ verified?: string }>;
}) {
  const { verified } = await searchParams;

  return (
    <div className="flex flex-col gap-5">
      {verified === "1" ? (
        <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-950">
          이메일 인증이 끝났습니다. POKA에 오신 것을 환영합니다.
        </p>
      ) : null}
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
