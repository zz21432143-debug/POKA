export function HomeHeroBanner() {
  return (
    <section aria-label="POKA 소개">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/hero/poka-community.webp"
        srcSet="/images/hero/poka-community-1280.webp 1280w, /images/hero/poka-community.webp 2170w"
        sizes="(max-width: 1320px) 100vw, 1320px"
        alt="홀덤 커뮤니티 POKA — 포커를 더 즐겁게, 함께하는 공간"
        width={2170}
        height={725}
        fetchPriority="high"
        decoding="async"
        className="h-auto w-full rounded-2xl object-cover shadow-[0_12px_40px_-18px_rgb(6_21_15_/_0.7)]"
      />
    </section>
  );
}
