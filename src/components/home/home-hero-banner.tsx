export function HomeHeroBanner() {
  return (
    <section
      aria-label="POKA 소개"
      className="hero-banner main-banner overflow-hidden rounded-2xl shadow-[0_14px_32px_rgb(0_0_0/0.45)]"
    >
      <div className="hero-banner-scrim" aria-hidden="true" />
      <div className="hero-banner-copy">
        <p className="hero-banner-tag">DEALER LOUNGE · BREAK</p>
        <p className="hero-banner-kicker">테이블 교대 끝, 모든 홀덤 현장의 중심</p>
        <h1 className="hero-banner-word">POKA</h1>
        <p className="hero-banner-pill">실시간 구인·구직부터 대회 정보, 핸드리뷰까지 한눈에</p>
      </div>
    </section>
  );
}
