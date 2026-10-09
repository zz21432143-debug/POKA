export function HomeHeroBanner() {
  return (
    <section aria-label="POKA 소개" className="hero-celestial overflow-hidden rounded-2xl shadow-[0_10px_28px_rgb(0_0_0/0.35)]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/theme/hero-celestial.jpg"
        alt=""
        width={1280}
        height={720}
        fetchPriority="high"
        decoding="async"
        className="h-auto w-full"
      />
      <div className="hero-celestial-scrim" aria-hidden="true" />
      <div className="hero-celestial-copy">
        <p className="hero-celestial-kicker">모든 홀덤 현장의 중심,</p>
        <p className="hero-celestial-word">POKA</p>
        <p className="hero-celestial-pill">실시간 구인·구직부터 대회 정보, 핸드리뷰까지 한눈에</p>
      </div>
    </section>
  );
}
