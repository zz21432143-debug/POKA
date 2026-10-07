export function HomeHeroBanner() {
  return (
    <section aria-label="POKA 소개" className="w-full">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/hero/poka-banner.webp"
        srcSet="/images/hero/poka-banner-1280.webp 1280w, /images/hero/poka-banner.webp 2000w"
        sizes="(max-width: 1320px) 100vw, 1320px"
        alt="홀덤을 사랑하는 모든 사람들의 커뮤니티, POKA"
        width={2000}
        height={667}
        fetchPriority="high"
        decoding="async"
        className="block h-auto w-full max-w-full rounded-2xl"
      />
    </section>
  );
}
