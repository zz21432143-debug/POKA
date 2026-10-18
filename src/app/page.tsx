import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "@/components/ui/link";
import { MegaphoneIcon } from "lucide-react";
import { HomePosterCarousel, type HomePoster } from "@/components/home/home-poster-carousel";
import { HomeLatest } from "@/components/home/home-latest";
import { HomeUrgentJobs } from "@/components/home/home-urgent-jobs";
import { HomeJobs } from "@/components/home/home-jobs";
import { GrowthHomePanel } from "@/components/home/growth-home-panel";
import { HomeDealerTools } from "@/components/home/home-dealer-tools";
import { HomeStudyTools } from "@/components/home/home-study-tools";
import { HomeQuiz } from "@/components/home/home-quiz";
import { HomeYokai } from "@/components/home/home-yokai";
import { HomeMissions } from "@/components/home/home-missions";
import { HomeRankings } from "@/components/home/home-rankings";
import { HomeSummary } from "@/components/home/home-summary";
import { todayKstDate } from "@/lib/dates";
import { getHomeFeed } from "@/lib/home-data";
import { getPremiumBanners } from "@/lib/premium-banners";
import { BoardBottomAd } from "@/components/ads/board-bottom-ad";
import { GoogleAdUnit } from "@/components/ads/google-ad-unit";
import { HomeHero } from "@/components/home/home-hero";
import { HomeBoardNav } from "@/components/home/home-board-nav";
import { HomeGuides } from "@/components/home/home-guides";
import { UrgentAlertPrompt } from "@/components/jobs/urgent-alert-prompt";
import { FREE_PROMO } from "@/lib/free-promo";

export const metadata: Metadata = { alternates: { canonical: "/" } };

function HomePanelFallback({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-2xl bg-white/[0.06] ${className}`} />;
}

/** 홍보 포스터 6구좌. 맡긴 포스터가 하나라도 있으면 넓게 돌리고, 모두 비어 있으면 큰 칸 대신 작은 안내 한 줄만 */
async function homePosters() {
  const banners = await getPremiumBanners().catch(() => []);
  const posters: HomePoster[] = banners.map((banner) =>
    banner.vacant || !banner.image || banner.image.startsWith("/banners/slot-")
      ? { key: `slot-${banner.id}`, slot: banner.id, href: FREE_PROMO.href, title: FREE_PROMO.title, image: FREE_PROMO.image, mark: FREE_PROMO.mark, plain: true }
      : { key: `slot-${banner.id}`, slot: banner.id, href: banner.href, title: banner.title, image: banner.image, mark: banner.mark },
  );
  return { posters, filled: posters.some((p) => !p.plain) };
}

/** 포스터 자리가 모두 비었을 때: PC 오른쪽 칸 작은 안내(휴대폰은 아래 광고 문의 카드가 같은 역할) */
function PromoSlotCard() {
  return (
    <Link
      href={FREE_PROMO.href}
      data-home-promo-slot
      className="lounge-card group hidden min-h-14 items-center gap-2.5 rounded-[1.35rem] px-4 hover:border-[#c9a25c] lg:flex"
    >
      <MegaphoneIcon aria-hidden className="size-5 shrink-0 text-[#e7c98a]" />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-black text-white">매장 · 대회 홍보 포스터 자리</span>
        <span className="block truncate text-xs text-[#b9aa92]">메인 포스터 무료 홍보 이벤트 진행 중</span>
      </span>
      <span className="shrink-0 text-xs font-bold text-[#e7c98a]">신청 ›</span>
    </Link>
  );
}

async function HomeFeedSections() {
  const [feed, promo] = await Promise.all([
    getHomeFeed().catch(() => ({
      all: [],
      free: [],
      jobs: [],
      hands: [],
      urgent: [],
      nativeSponsor: null,
      hand: null,
      hub: null,
    })),
    homePosters(),
  ]);
  const today = todayKstDate();
  return (
    <>
      {/* 가장 급한 것부터: 급구(있을 때만 — 0건은 위 요약 칸에 보임) → 지원 · 대회 딜러 구인 */}
      {feed.urgent.length ? <HomeUrgentJobs jobs={feed.urgent} /> : null}
      <HomeJobs jobs={feed.jobs} />
      <GoogleAdUnit placement="home-top" />
      {/* 매장 관리 · 홀덤 공부 도구(PC는 나란히, 높이 맞춤) */}
      <div data-home-shortcuts className="grid grid-cols-[minmax(0,1fr)] gap-2.5 lg:grid-cols-2 [&>*]:min-w-0">
        <HomeDealerTools />
        <HomeStudyTools />
      </div>
      {/* 홍보 포스터(유료 구좌): 맡긴 포스터가 있을 때만 넓게 */}
      {promo.filled ? <HomePosterCarousel posters={promo.posters} /> : null}
      <GoogleAdUnit placement="home-mid" />
      {/* 아래는 PC 두 칸: 왼쪽 글(최신글 · 핸드 · 가이드) · 오른쪽 매일 할 것(미션 · 퀴즈 · 요괴 · 랭킹) — 칸마다 따로 쌓여 빈 공간이 없게 */}
      <div data-home-columns className="grid grid-cols-[minmax(0,1fr)] gap-2.5 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)] lg:items-start">
        <div id="home-latest" className="grid min-w-0 scroll-mt-24 content-start gap-2.5">
          <HomeLatest all={feed.all} free={feed.free} hands={feed.hands} nativeSponsor={feed.nativeSponsor} />
          <GoogleAdUnit placement="infeed" />
          <GrowthHomePanel today={today} hand={feed.hand} hub={feed.hub} />
          {/* 오늘의 딜러 가이드 3편(날마다 바뀜) */}
          <HomeGuides />
        </div>
        <div data-home-side className="grid min-w-0 content-start gap-2.5">
          <Suspense fallback={null}>
            <HomeMissions />
          </Suspense>
          <Suspense fallback={<HomePanelFallback className="h-14" />}>
            <HomeQuiz />
          </Suspense>
          <Suspense fallback={null}>
            <HomeYokai />
          </Suspense>
          <Suspense fallback={<HomePanelFallback className="h-48" />}>
            <HomeRankings />
          </Suspense>
          {promo.filled ? null : <PromoSlotCard />}
        </div>
      </div>
    </>
  );
}

/**
 * 홈 순서: 대문 · 오늘 요약(PC는 나란히) → 바로가기 한 줄 → 급구 · 구인 → 매장 관리 · 공부 도구 → (포스터) → 두 칸(글 | 매일 할 것).
 * 내용 없는 칸은 그리지 않고, PC는 칸을 나란히 두어 가로로 남는 자리가 없게 합니다.
 */
export default async function HomePage() {
  return (
    <div className="flex flex-col gap-2.5">
      <div data-home-top className="grid grid-cols-[minmax(0,1fr)] gap-2.5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:items-stretch">
        <HomeHero />
        <Suspense fallback={<HomePanelFallback className="h-28" />}>
          <HomeSummary />
        </Suspense>
      </div>
      {/* 게시판 · 매장 관리 바로가기 한 줄 */}
      <Suspense fallback={<HomePanelFallback className="h-10" />}>
        <HomeBoardNav />
      </Suspense>
      {/* 앱을 설치한 사람에게 한 번: 급구 알림 켜기 */}
      <UrgentAlertPrompt />
      <Suspense
        fallback={
          <div className="flex flex-col gap-2.5">
            <HomePanelFallback className="h-40" />
            <HomePanelFallback className="h-56" />
          </div>
        }
      >
        <HomeFeedSections />
      </Suspense>
      <BoardBottomAd placement="home-bottom" />
    </div>
  );
}
