export function HomeHeroBanner() {
  return (
    <section aria-label="POKA 소개" className="overflow-hidden rounded-2xl shadow-[0_10px_28px_rgb(0_0_0/0.35)]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/theme/hero-center.jpg"
        alt="모든 홀덤 현장의 중심, POKA. 실시간 구인·구직부터 대회 정보, 핸드리뷰까지 한눈에"
        width={1280}
        height={720}
        fetchPriority="high"
        decoding="async"
        className="h-auto w-full"
      />
    </section>
  );
}
