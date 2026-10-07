export function HomeHeroBanner() {
  return (
    <section aria-label="POKA 소개" className="w-full">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/hero/poka-hero.webp"
        srcSet="/images/hero/poka-hero-1280.webp 1280w, /images/hero/poka-hero.webp 2170w"
        sizes="(max-width: 1320px) 100vw, 1320px"
        alt="홀덤 커뮤니티 POKA — 포커를 더 즐겁게, 함께하는 공간"
        width={2170}
        height={725}
        fetchPriority="high"
        decoding="async"
        className="block h-auto w-full max-w-full"
      />
    </section>
  );
}
