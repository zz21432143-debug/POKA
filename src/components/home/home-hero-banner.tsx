export function HomeHeroBanner() {
  return (
    <section
      aria-label="POKA 소개"
      className="hero-banner main-banner overflow-hidden rounded-2xl shadow-[0_14px_32px_rgb(0_0_0/0.45)]"
    >
      <div className="hero-banner-scrim" aria-hidden="true" />
      <span className="hero-banner-seal" lang="ja" aria-hidden="true">
        百八妖怪
      </span>
      <div className="hero-banner-copy">
        <p className="hero-banner-tag">호리병 봉인 해제</p>
        <h1 className="hero-banner-kicker">
          <span className="block whitespace-nowrap">깨진 호리병에서 108요괴가 쏟아졌다</span>
          <span className="block whitespace-nowrap">
            모든 홀덤 현장의 중심, <strong className="hero-banner-brand">POKA</strong>
          </span>
        </h1>
        <p className="hero-banner-pill">실시간 구인·구직부터 대회 정보, 핸드리뷰까지 한눈에</p>
      </div>
    </section>
  );
}
