export function HomeHeroBanner() {
  return (
    <section aria-label="POKA 소개" className="hero-banner overflow-hidden rounded-2xl shadow-[0_10px_28px_rgb(0_0_0/0.35)]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/theme/yokai-hero-banner.jpg"
        alt="모든 홀덤 현장의 중심, POKA. 실시간 구인·구직부터 대회 정보, 핸드리뷰까지 한눈에"
        width={1280}
        height={720}
        fetchPriority="high"
        decoding="async"
        className="h-auto w-full"
      />
      <div className="hero-banner-scrim" aria-hidden="true" />
      <div className="hero-banner-copy">
        <p className="hero-banner-kicker">모든 홀덤 현장의 중심,</p>
        <p className="hero-banner-word">POKA</p>
        <p className="hero-banner-pill">실시간 구인·구직부터 대회 정보, 핸드리뷰까지 한눈에</p>
      </div>
    </section>
  );
}
