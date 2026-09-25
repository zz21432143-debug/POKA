export function HomeHeroBanner() {
  return (
    <section aria-label="POKA 소개">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/hero/poka-community.png"
        alt="홀덤을 사랑하는 모든 사람들의 커뮤니티, POKA"
        className="h-auto w-full rounded-2xl border border-border object-cover shadow-sm"
      />
    </section>
  );
}
