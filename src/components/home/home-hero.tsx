import Link from "next/link";
import { POKA_FEATURES, POKA_TAGLINE } from "@/lib/brand-copy";
import { HeroCarousel } from "@/components/home/hero-carousel";

/**
 * 홈 맨 위 대문(작게): 왼쪽 홍보 문구 + 바로가기, 오른쪽 POKA 마스코트 그림.
 * 예전 큰 그림(높이 절반 이상)을 줄여 첫 화면에 공고가 바로 보이게 합니다.
 */
export function HomeHero() {
  const games = process.env.GAMES_PUBLIC !== "0";
  const main = (
    <section aria-label="POKA 하나로" className="relative h-full overflow-hidden rounded-[1.35rem] border border-[#c9a25c]/40 bg-black">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/hero/poka-hero.webp"
        // 휴대폰은 작은 그림(24KB), 넓은 화면은 원본
        srcSet="/images/hero/poka-hero-720.webp 720w, /images/hero/poka-hero.webp 1254w"
        sizes="(min-width: 640px) 62vw, 78vw"
        alt=""
        aria-hidden
        width={1254}
        height={600}
        fetchPriority="high"
        className="absolute inset-y-0 right-0 h-full w-[78%] object-cover object-[70%_45%] sm:w-[62%]"
      />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,#0b0706_30%,rgba(11,7,6,.85)_52%,rgba(11,7,6,.15)_100%)]" />
      <div className="relative grid gap-2.5 px-4 py-4 sm:gap-3 sm:px-6 sm:py-6">
        <p className="hidden text-[11px] font-black tracking-[0.3em] text-[#c9a25c] sm:block">HOLDEM COMMUNITY · POKA</p>
        <h1 className="max-w-[17rem] text-[1.2rem] leading-snug font-black text-white sm:max-w-md sm:text-[1.9rem]">{POKA_TAGLINE}</h1>
        <ul className="flex max-w-md flex-wrap gap-1.5">
          {POKA_FEATURES.map((f) => (
            <li key={f.href}>
              <Link href={f.href} className="touch-target inline-flex min-h-10 items-center rounded-full border border-[#c9a25c]/50 bg-black/60 px-3 text-xs sm:min-h-9 sm:px-3 sm:text-[13px] font-bold text-[#f3d9a4] hover:border-[#c9a25c] hover:text-white">
                {f.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
  if (!games) return main;
  // 롤링: ① 요괴 마을 · 요괴 게임방(메인) ② 딜러 구인구직 · 매장 관리
  return (
    <HeroCarousel
      slides={[
        { key: "games", label: "요괴 마을 · 요괴 게임방", node: <GamesSlide />, ms: 10000 },
        { key: "main", label: "구인구직 · 매장 관리", node: main },
      ]}
    />
  );
}

/** 대문 첫 장: 요괴 마을(메인) + 요괴 게임방(윷놀이 · 오목) 오픈 — 그림 가운데 「요괴마을」 간판이 보이게 */
function GamesSlide() {
  return (
    <section aria-label="요괴 마을 · 요괴 게임방" data-hero-yokai className="relative h-full min-h-[183px] overflow-hidden rounded-[1.35rem] border border-[#ffcf4a]/50 bg-[#140b24] sm:min-h-[210px]">
      {/* eslint-disable-next-line @next/next/no-img-element -- 대문 그림(요괴 마을) */}
      <img
        src="/images/hero/yokai-village.webp"
        srcSet="/images/hero/yokai-village-860.webp 860w, /images/hero/yokai-village.webp 1600w"
        sizes="(min-width: 1024px) 70vw, 100vw"
        alt="요괴 마을 — 요괴 키우기 · POKA 홀덤 커뮤니티"
        width={1600}
        height={684}
        fetchPriority="high"
        className="absolute inset-0 size-full object-cover object-[50%_48%]"
      />
      {/* 그림 어디를 눌러도 요괴 마을로(아래 버튼은 각자 갈 곳으로) */}
      <Link href="/yokai" data-hero-yokai-link aria-label="요괴 마을 가기" draggable={false} className="absolute inset-0 z-[1]" />
      {/* 글씨가 잘 보이게 왼쪽 · 아래만 살짝 어둡게(가운데 간판은 그대로) */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(10,6,20,.82)_0%,rgba(10,6,20,.35)_30%,transparent_45%,transparent_70%,rgba(10,6,20,.55)_100%)]" />
      <div className="pointer-events-none relative z-[2] flex h-full flex-col justify-between gap-2 px-4 py-3 sm:px-6 sm:py-4">
        <div className="grid max-w-[13rem] gap-1 sm:max-w-[17rem]">
          <p className="w-fit rounded-full bg-black/60 px-2 text-[10px] font-black tracking-[0.2em] text-[#ffcf4a] sm:bg-transparent sm:px-0 sm:text-[11px] sm:tracking-[0.25em]">
            <span className="sm:hidden">🏮 요괴 마을 · NEW OPEN</span>
            <span className="hidden sm:inline">POKA · NEW OPEN</span>
          </p>
          {/* 휴대폰은 그림 가운데 「요괴마을」 간판을 가리지 않게 글씨는 숨김 */}
          <h2 className="hidden text-2xl leading-tight font-black text-white [text-shadow:2px_2px_0_#0a0614] sm:block">
            요괴 마을 오픈!
            <span className="block text-xs font-bold text-[#f3e8ff] sm:text-sm">요괴 키우고 ·<br />요괴 게임방에서 윷놀이 · 오목 한 판</span>
          </h2>
        </div>
        <div className="pointer-events-auto flex w-fit flex-wrap gap-1.5 pr-12 sm:pr-0">
          <Link href="/yokai" className="touch-target inline-flex min-h-9 items-center rounded-full border-2 border-[#ffcf4a] sm:min-h-10 bg-[#ffcf4a] px-2.5 text-xs font-black text-[#2a1400] shadow-[2px_2px_0_#0a0614] sm:px-3 sm:text-sm">
            🏮 요괴 마을 가기
          </Link>
          <Link href="/games/yut" className="touch-target inline-flex min-h-9 items-center rounded-full border-2 border-[#ffcf4a] sm:min-h-10/80 bg-black/60 px-2.5 text-xs font-black text-[#ffe08a] sm:px-3 sm:text-sm">
            🎲 윷놀이
          </Link>
          <Link href="/games/omok" className="touch-target inline-flex min-h-9 items-center rounded-full border-2 border-[#ffcf4a] sm:min-h-10/80 bg-black/60 px-2.5 text-xs font-black text-[#ffe08a] sm:px-3 sm:text-sm">
            ⚫ 오목
          </Link>
        </div>
      </div>
    </section>
  );
}
