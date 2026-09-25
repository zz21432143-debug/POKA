export function HomeHeroBanner() {
  return (
    <section aria-label="POKA 소개">
      <picture>
        <source srcSet="/images/hero/poka-community.webp" type="image/webp" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/hero/poka-community.jpg"
          alt="홀덤을 사랑하는 모든 사람들의 커뮤니티, POKA"
          width={2000}
          height={667}
          className="h-auto w-full rounded-2xl object-cover shadow-[0_12px_40px_-18px_rgb(6_21_15_/_0.7)]"
        />
      </picture>
    </section>
  );
}
