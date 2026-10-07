export function HomeHeroBanner() {
  return (
    <section aria-label="POKA 소개">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/hero/poka-community.png"
        alt="홀덤 커뮤니티 POKA — 포커를 더 즐겁게, 함께하는 공간"
        width={2170}
        height={725}
        className="h-auto w-full rounded-2xl object-cover shadow-[0_12px_40px_-18px_rgb(6_21_15_/_0.7)]"
      />
    </section>
  );
}
