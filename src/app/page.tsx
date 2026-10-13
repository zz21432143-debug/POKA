import type { Metadata } from "next";
import { Suspense } from "react";
import { HomePosterCarousel, type HomePoster } from "@/components/home/home-poster-carousel";
import { HomeLatest } from "@/components/home/home-latest";
import { HomeUrgentJobs } from "@/components/home/home-urgent-jobs";
import { HomeJobs } from "@/components/home/home-jobs";
import { GrowthHomePanel } from "@/components/home/growth-home-panel";
import { HomeAttendanceCta } from "@/components/home/home-attendance-cta";
import { HomeDealerTools } from "@/components/home/home-dealer-tools";
import { todayKstDate } from "@/lib/dates";
import { getHomeFeed } from "@/lib/home-data";
import { getPremiumBanners } from "@/lib/premium-banners";
import { BoardBottomAd } from "@/components/ads/board-bottom-ad";
import { HomeHero } from "@/components/home/home-hero";
import { FREE_PROMO } from "@/lib/free-promo";

export const metadata: Metadata = { alternates: { canonical: "/" } };

function HomePanelFallback({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-2xl bg-white/[0.06] ${className}`} />;
}

async function HomePosters() {
  const banners = await getPremiumBanners();
  // 비어 있는 구좌(이미지 없이 기본 그림 /banners/slot-N.svg만 있는 홍보 포함)는 "POKA 무료 홍보 이벤트" 포스터로 채웁니다.
  const posters: HomePoster[] = banners.map((banner) =>
    banner.vacant || !banner.image || banner.image.startsWith("/banners/slot-")
      ? {
          key: `slot-${banner.id}`,
          slot: banner.id,
          href: FREE_PROMO.href,
          title: FREE_PROMO.title,
          image: FREE_PROMO.image,
          mark: FREE_PROMO.mark,
          plain: true,
        }
      : {
          key: `slot-${banner.id}`,
          slot: banner.id,
          href: banner.href,
          title: banner.title,
          image: banner.image,
          mark: banner.mark,
        },
  );
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
      {/* 메인은 지원 딜러 구인: 전체 폭 카드로 크게 보여 주고, 그 아래 급구/대타. */}
      <HomeJobs jobs={feed.jobs} />
      <HomeUrgentJobs jobs={feed.urgent} />
      <HomeAttendanceCta />
      <HomeDealerTools />
      <HomeLatest all={feed.all} free={feed.free} hands={feed.hands} nativeSponsor={feed.nativeSponsor} />
      <GrowthHomePanel today={today} hand={feed.hand} hub={feed.hub} />
    </>
  );
}

export default async function HomePage() {
  return (
    <div className="flex flex-col gap-3.5">
      {/* 맨 위: POKA 대표 그림, 그 아래 홍보 포스터 */}
      <HomeHero />
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
      <BoardBottomAd placement="home-bottom" />
    </div>
  );
}
