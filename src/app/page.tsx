import { Suspense } from "react";
import { HomePosterCarousel, type HomePoster } from "@/components/home/home-poster-carousel";
import { HomeLatest } from "@/components/home/home-latest";
import { HomeUrgentJobs } from "@/components/home/home-urgent-jobs";
import { HomeJobs } from "@/components/home/home-jobs";
import { GrowthHomePanel } from "@/components/home/growth-home-panel";
import { todayKstDate } from "@/lib/dates";
import { getHomeFeed } from "@/lib/home-data";
import { getPremiumBanners } from "@/lib/premium-banners";

function HomePanelFallback({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-2xl bg-white/[0.06] ${className}`} />;
}

async function HomePosters() {
  const banners = await getPremiumBanners();
  const posters: HomePoster[] = banners.map((banner) => ({
    key: `slot-${banner.id}`,
    slot: banner.id,
    href: banner.href,
    title: banner.title,
    image: banner.vacant ? null : banner.image || null,
    mark: banner.mark,
  }));
  return <HomePosterCarousel posters={posters} />;
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
  }));
  const today = todayKstDate();
  return (
    <>
      {/* 메인은 지원 딜러 구인, 그다음 급구/대타. PC에서는 나란히 둬 홈 스크롤을 줄입니다. */}
      <div className="grid gap-3.5 lg:grid-cols-2">
        <HomeJobs jobs={feed.jobs} />
        <HomeUrgentJobs jobs={feed.urgent} />
      </div>
      <HomeLatest all={feed.all} free={feed.free} hands={feed.hands} nativeSponsor={feed.nativeSponsor} />
      <GrowthHomePanel today={today} hand={feed.hand} hub={feed.hub} />
    </>
  );
}

export default async function HomePage() {
  return (
    <div className="flex flex-col gap-3.5">
      <Suspense fallback={<HomePanelFallback className="aspect-[15/7]" />}>
        <HomePosters />
      </Suspense>
      <Suspense
        fallback={
          <div className="flex flex-col gap-3.5">
            <HomePanelFallback className="h-56" />
            <HomePanelFallback className="h-40" />
          </div>
        }
      >
        <HomeFeedSections />
      </Suspense>
    </div>
  );
}
