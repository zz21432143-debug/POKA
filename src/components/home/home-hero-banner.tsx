export function HomeHeroBanner() {
  return (
    <section aria-label="POKA 소개">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/hero/poka-community.webp"
        alt="홀덤을 사랑하는 모든 사람들의 커뮤니티, POKA"
        className="h-auto w-full rounded-2xl object-cover shadow-[0_12px_40px_-18px_rgb(6_21_15_/_0.7)]"
      />
    </section>
  );
}
