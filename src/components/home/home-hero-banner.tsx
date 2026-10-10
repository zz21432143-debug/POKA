export function HomeHeroBanner() {
  return (
    <section
      aria-label="POKA 소개"
      className="hero-banner main-banner overflow-hidden rounded-2xl shadow-[0_14px_32px_rgb(0_0_0/0.5)]"
    >
      <div className="hero-banner-scrim" aria-hidden="true" />
      <span className="hero-banner-seal" lang="ja" aria-hidden="true">
        百八妖怪
      </span>
      <div className="hero-banner-copy">
        <p className="hero-banner-tag">대한민국 대표 딜러 커뮤니티</p>
        <h1 className="hero-banner-title">
          카드 섞다 멘탈 나간 요괴들의 쉼터,
          <strong className="hero-banner-brand">POKA</strong>
        </h1>
        <p className="hero-banner-sub">딜러 구인·구직부터 실수담, 사건사고 썰까지 한곳에서</p>
      </div>
    </section>
  );
}
