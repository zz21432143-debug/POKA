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
import { HomeMyStatus } from "@/components/home/home-my-status";
import { todayKstDate } from "@/lib/dates";
import { getHomeFeed } from "@/lib/home-data";
import { getPremiumBanners } from "@/lib/premium-banners";
import { BoardBottomAd } from "@/components/ads/board-bottom-ad";
import { GoogleAdUnit } from "@/components/ads/google-ad-unit";
import { HomeHero } from "@/components/home/home-hero";
import { HomeBoardNav } from "@/components/home/home-board-nav";
import { HomeGuides } from "@/components/home/home-guides";
import { HomeHandWeek } from "@/components/home/home-hand-week";
import { UrgentAlertPrompt } from "@/components/jobs/urgent-alert-prompt";
import { FREE_PROMO } from "@/lib/free-promo";
import { getCurrentUser } from "@/lib/current-user";
import { FIRST_POST_POINTS, firstPostBonusOpen } from "@/lib/first-post";
import { TALK_TOPICS, todayTopicIndex } from "@/lib/talk-topics";

export const metadata: Metadata = { alternates: { canonical: "/" } };

function HomePanelFallback({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-2xl bg-white/[0.06] ${className}`} />;
}

/** 홈 구역 제목: 제목 · 한 줄 설명 · 아래 가는 선(구역 경계가 한눈에) */
function HomeSection({ id, title, hint, className, children }: { id: string; title: string; hint?: string; className?: string; children: React.ReactNode }) {
  return (
    <section aria-label={title} data-home-section={id} className={`grid min-w-0 content-start gap-2.5 ${className ?? ""}`}>
      <div className="flex items-baseline gap-2 border-b border-white/10 px-1 pb-1.5">
        <h2 className="text-lg font-black text-[#f6efe2] sm:text-xl">{title}</h2>
        {hint ? <p className="hidden truncate text-sm text-[#a89c88] sm:block">{hint}</p> : null}
      </div>
      {children}
    </section>
  );
}

/**
 * 두 단(PC): 왼쪽 본문 · 오른쪽 좁은 칸(22rem).
 * 휴대폰은 한 줄로 쌓되 칸을 풀어(contents) order 순서대로 섞음 — 「오늘」이 구인보다 위에 오게.
 */
function HomeColumns({ main, side }: { main: React.ReactNode; side: React.ReactNode }) {
  return (
    <div data-home-columns className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start xl:grid-cols-[minmax(0,1fr)_24rem]">
      <div data-home-main className="contents lg:sticky lg:bottom-4 lg:grid lg:min-w-0 lg:content-start lg:gap-5 lg:self-end">{main}</div>
      <aside data-home-side className="contents lg:sticky lg:bottom-4 lg:grid lg:min-w-0 lg:content-start lg:gap-5 lg:self-end">{side}</aside>
    </div>
  );
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

async function HomeJobsSection() {
  const feed = await getHomeFeed().catch(() => null);
  return (
    <HomeSection id="jobs" title="구인 · 빈자리" hint="오늘 일할 곳 · 급구" className="order-2 lg:order-none">
      {feed?.urgent.length ? <HomeUrgentJobs jobs={feed.urgent} /> : null}
      <HomeJobs jobs={feed?.jobs ?? []} />
      <GoogleAdUnit placement="home-top" />
    </HomeSection>
  );
}

async function HomeCommunitySection() {
  const feed = await getHomeFeed().catch(() => null);
  // 첫 글 보너스 안내: 아직 안 받은 회원만
  const user = await getCurrentUser().catch(() => null);
  const firstBonus = user && (await firstPostBonusOpen(user.id).catch(() => false)) ? FIRST_POST_POINTS : null;
  const today = todayKstDate();
  const topicIndex = todayTopicIndex(today);
  return (
    <HomeSection id="community" title="커뮤니티" hint="새 글 · 자유 · 핸드리뷰" className="order-6 lg:order-none">
      <div id="home-latest" className="grid min-w-0 scroll-mt-24 content-start gap-2.5">
        <HomeLatest all={feed?.all ?? []} free={feed?.free ?? []} hands={feed?.hands ?? []} nativeSponsor={feed?.nativeSponsor ?? null} firstBonus={firstBonus} topic={{ index: topicIndex, text: TALK_TOPICS[topicIndex] }} />
        <GoogleAdUnit placement="infeed" />
        {/* 핸드는 위 「이번 주의 핸드 문제」가 맡음 — 여기는 이번 주 대회만 */}
        <GrowthHomePanel today={today} hand={null} hub={feed?.hub ?? null} />
      </div>
    </HomeSection>
  );
}

/** 홍보 포스터(유료 구좌): 맡긴 포스터가 있을 때만 넓게 · 모두 비면 오른쪽 칸 작은 안내 */
async function HomePosters({ slot }: { slot: "wide" | "side" }) {
  const promo = await homePosters();
  if (slot === "wide") return promo.filled ? <HomePosterCarousel posters={promo.posters} /> : null;
  return promo.filled ? null : <PromoSlotCard />;
}

/**
 * 홈 순서(PokerListings처럼 본문 | 오른쪽 칸): 대문 · 오늘 요약 → 바로가기 한 줄 →
 * [본문: 구인 → 포스터 → 커뮤니티 → 도구 → 가이드 | 오른쪽: 오늘(퀴즈 · 요괴) → 미션 → 핸드 문제 → 랭킹].
 * 로그인 여부로 오른쪽 길이가 크게 달라져서 묶음을 나누지 않고, 짧은 쪽이 따라 내려오게 함.
 */
export default async function HomePage() {
  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-2.5">
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
        {/* 회원: 레벨 · 경험치 · 포인트 · 연속 출석 · 출석 버튼 한 줄 */}
        <Suspense fallback={null}>
          <HomeMyStatus />
        </Suspense>
        {/* 앱을 설치한 사람에게 한 번: 급구 알림 켜기 */}
        <UrgentAlertPrompt />
      </div>

      {/* 한 묶음 두 칸: 본문 | 오른쪽 칸. 오른쪽 칸은 짧으면 스크롤을 따라 내려와(sticky) 중간에 빈칸이 안 생김 */}
      <HomeColumns
        main={
          <>
            <Suspense fallback={<HomePanelFallback className="order-2 h-56 lg:order-none" />}>
              <HomeJobsSection />
            </Suspense>
            <div className="order-4 grid min-w-0 gap-2.5 empty:hidden lg:order-none">
              <Suspense fallback={null}>
                <HomePosters slot="wide" />
              </Suspense>
              <GoogleAdUnit placement="home-mid" />
            </div>
            <Suspense fallback={<HomePanelFallback className="order-6 h-72 lg:order-none" />}>
              <HomeCommunitySection />
            </Suspense>
            <HomeSection id="tools" title="매장 도구 · 홀덤 공부" hint="회원 무료 · 로그인 없이 쓰는 공부 도구" className="order-7 lg:order-none">
              <div data-home-shortcuts className="grid grid-cols-[minmax(0,1fr)] gap-2.5 xl:grid-cols-2 [&>*]:min-w-0">
                <HomeDealerTools />
                <HomeStudyTools />
              </div>
            </HomeSection>
            {/* 오늘의 딜러 가이드 3편(날마다 바뀜) */}
            <div className="order-9 min-w-0 lg:order-none">
              <HomeGuides />
            </div>
          </>
        }
        side={
          <>
            <HomeSection id="today" title="오늘" hint="퀴즈 · 요괴 밥" className="order-1 lg:order-none">
              <Suspense fallback={<HomePanelFallback className="h-40" />}>
                <HomeQuiz />
              </Suspense>
              <Suspense fallback={<HomePanelFallback className="h-14" />}>
                <HomeYokai />
              </Suspense>
            </HomeSection>
            <div className="order-3 grid min-w-0 content-start gap-2.5 empty:hidden lg:order-none">
              <Suspense fallback={null}>
                <HomeMissions />
              </Suspense>
            </div>
            <HomeSection id="hand" title="핸드 문제" hint="이번 주 투표" className="order-5 lg:order-none [&:not(:has(>[data-home-hand-week]))]:hidden">
              <Suspense fallback={null}>
                <HomeHandWeek />
              </Suspense>
            </HomeSection>
            <div data-home-section="ranking" className="order-8 grid min-w-0 content-start gap-2.5 lg:order-none">
              <Suspense fallback={<HomePanelFallback className="h-48" />}>
                <HomeRankings />
              </Suspense>
              <Suspense fallback={null}>
                <HomePosters slot="side" />
              </Suspense>
            </div>
          </>
        }
      />

      {/* POKA 소개(검색 · 광고 심사용 몇 줄) */}
      <section aria-label="POKA 소개" data-home-about className="grid gap-1.5 border-t border-white/10 px-1 pt-5">
        <h2 className="text-base font-black text-[#d9cfbd]">POKA는</h2>
        <p className="max-w-3xl text-sm leading-7 text-[#a89c88]">
          딜러 구인구직, 매장 운영 도구(딜러 로테이션 · 게임 현황판 · 샷클락 · 싯드로우 · 급여 계산기), 홀덤 공부(가이드 · 공부 코스 · 용어 사전 · 푸시폴드 퀴즈 · 현장 판정 사례)를 한곳에 모은 홀덤 커뮤니티예요. 모두 무료이고, 돈을 거는 게임은 다루지 않아요.
        </p>
      </section>
      <BoardBottomAd placement="home-bottom" />
    </div>
  );
}
