import type { Metadata } from "next";
import { Suspense } from "react";
import { HomePosterCarousel, type HomePoster } from "@/components/home/home-poster-carousel";
import { HomeLatest } from "@/components/home/home-latest";
import { HomeUrgentJobs } from "@/components/home/home-urgent-jobs";
import { HomeJobs } from "@/components/home/home-jobs";
import { GrowthHomePanel } from "@/components/home/growth-home-panel";
import { HomeDealerTools } from "@/components/home/home-dealer-tools";
import { HomeStudyTools } from "@/components/home/home-study-tools";
import { HomeQuiz } from "@/components/home/home-quiz";
import { YokaiNudge } from "@/components/yokai/yokai-nudge";
import { HomeMissions } from "@/components/home/home-missions";
import { HomeRankings } from "@/components/home/home-rankings";
import { HomeSummary } from "@/components/home/home-summary";
import { todayKstDate } from "@/lib/dates";
import { getHomeFeed } from "@/lib/home-data";
import { getPremiumBanners } from "@/lib/premium-banners";
import { BoardBottomAd } from "@/components/ads/board-bottom-ad";
import { FreePromoBanner } from "@/components/ads/free-promo-banner";
import { GoogleAdUnit } from "@/components/ads/google-ad-unit";
import { HomeHero } from "@/components/home/home-hero";
import { UrgentAlertPrompt } from "@/components/jobs/urgent-alert-prompt";
import { FREE_PROMO } from "@/lib/free-promo";

export const metadata: Metadata = { alternates: { canonical: "/" } };

function HomePanelFallback({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-2xl bg-white/[0.06] ${className}`} />;
}

/** 홍보 포스터 6구좌: 늘 6장이 돌아갑니다. 비어 있는 구좌는 "POKA 무료 홍보 이벤트" 포스터로 채워 '맡길 자리'가 보이게 합니다. */
async function HomePosters() {
  const banners = await getPremiumBanners().catch(() => []);
  const posters: HomePoster[] = banners.map((banner) =>
    banner.vacant || !banner.image || banner.image.startsWith("/banners/slot-")
      ? { key: `slot-${banner.id}`, slot: banner.id, href: FREE_PROMO.href, title: FREE_PROMO.title, image: FREE_PROMO.image, mark: FREE_PROMO.mark, plain: true }
      : { key: `slot-${banner.id}`, slot: banner.id, href: banner.href, title: banner.title, image: banner.image, mark: banner.mark },
  );
  if (posters.length === 0) return <FreePromoBanner variant="wide" />;
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
      {/* 가장 급한 것부터: 급구 → 지원 · 대회 딜러 구인 */}
      <HomeUrgentJobs jobs={feed.urgent} />
      <HomeJobs jobs={feed.jobs} />
      {/* 홍보 포스터(유료 구좌): 공고 바로 아래 — 잘 보이는 자리 */}
      <Suspense fallback={<HomePanelFallback className="h-24" />}>
        <HomePosters />
      </Suspense>
      <GoogleAdUnit placement="home-mid" />
      <HomeLatest all={feed.all} free={feed.free} hands={feed.hands} nativeSponsor={feed.nativeSponsor} />
      <GrowthHomePanel today={today} hand={feed.hand} hub={feed.hub} />
    </>
  );
}

/**
 * 홈 순서: 대문(POKA 하나로) → 오늘 요약 → 홀덤 공부 도구 → 급구 → 구인 → 홍보 포스터 → 최신글 · 핸드/대회 → 랭킹 → 매장 관리 바로가기.
 * 오른쪽 칸은 없애고(내 정보는 머리줄에서 펼침) 가운데를 넓게 씁니다.
 */
export default async function HomePage() {
  return (
    <div className="flex flex-col gap-3.5">
      <HomeHero />
      {/* 앱을 설치한 사람에게 한 번: 급구 알림 켜기 */}
      <UrgentAlertPrompt />
      {/* 요괴 마을: 새 요괴 · 배고픔 알림(공개 전에는 마스터만) */}
      <Suspense fallback={null}>
        <YokaiNudge />
      </Suspense>
      <Suspense fallback={<HomePanelFallback className="h-16" />}>
        <HomeSummary />
      </Suspense>
      {/* 오늘의 미션(로그인 회원) */}
      <Suspense fallback={null}>
        <HomeMissions />
      </Suspense>
      {/* 무료 홀덤 공부 도구(GTO · 승률 · ICM · 레인지 · 족보) */}
      <HomeStudyTools />
      {/* 오늘의 퀴즈: 매일 한 문제 */}
      <Suspense fallback={<HomePanelFallback className="h-40" />}>
        <HomeQuiz />
      </Suspense>
      <Suspense
        fallback={
          <div className="flex flex-col gap-3.5">
            <HomePanelFallback className="h-40" />
            <HomePanelFallback className="h-56" />
          </div>
        }
      >
        <HomeFeedSections />
      </Suspense>
      {/* 레벨 · 마크 · 팟 계산 랭킹 */}
      <Suspense fallback={<HomePanelFallback className="h-48" />}>
        <HomeRankings />
      </Suspense>
      <HomeDealerTools />
      <BoardBottomAd placement="home-bottom" />
    </div>
  );
}
