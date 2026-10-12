/** 홈 맨 위 대표 그림(POKA 브랜드 일러스트). 그림 안에 POKA 로고와 HOLDEM COMMUNITY 문구가 들어 있습니다. */
export function HomeHero() {
  return (
    <section aria-label="POKA 홀덤 커뮤니티" className="overflow-hidden rounded-[1.35rem] border border-[#c9a25c]/40 bg-black shadow-[0_10px_28px_rgb(0_0_0/0.35)]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/hero/poka-hero.webp"
        alt="POKA 홀덤 커뮤니티 — 홀덤 테이블에 앉은 POKA 마스코트"
        width={1254}
        height={600}
        fetchPriority="high"
        className="block aspect-[1254/600] h-auto w-full object-cover"
      />
    </section>
  );
}
