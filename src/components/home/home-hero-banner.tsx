export function HomeHeroBanner() {
  return (
    <section aria-label="POKA 소개" className="w-full overflow-hidden rounded-2xl">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/hero/poka-community.png"
        srcSet="/images/hero/poka-community-1280.webp 1280w, /images/hero/poka-community.webp 2000w"
        sizes="(max-width: 1320px) 100vw, 1320px"
        alt="홀덤을 사랑하는 모든 사람들의 커뮤니티, POKA"
        width={2000}
        height={667}
        fetchPriority="high"
        decoding="async"
        className="block h-auto w-full max-w-full"
      />
    </section>
  );
}
