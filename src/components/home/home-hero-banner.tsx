export function HomeHeroBanner() {
  return (
    <section
      aria-label="POKA 소개"
      className="relative min-h-[16rem] overflow-hidden rounded-2xl border border-[#E2D7C5] shadow-[0_2px_8px_rgb(0_0_0/0.06)] sm:min-h-[18rem]"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/theme/hero-tribe.jpg"
        alt=""
        width={1280}
        height={720}
        fetchPriority="high"
        decoding="async"
        className="absolute inset-0 h-full w-full object-cover object-[70%_center]"
      />
      <div className="relative flex min-h-[16rem] max-w-[32rem] flex-col justify-center bg-gradient-to-r from-[#3D2413]/78 via-[#3D2413]/38 to-transparent px-5 py-6 sm:min-h-[18rem] sm:px-7">
        <p className="text-sm font-bold tracking-[0.28em] text-[#F3D48A] sm:text-base">
          POKA
        </p>
        <h1
          className="mt-1 text-4xl leading-none tracking-tight text-[#FFF8EE] sm:text-5xl sm:whitespace-nowrap"
          style={{
            fontFamily: "var(--font-display), var(--font-sans), sans-serif",
            textShadow: "0 2px 10px rgba(43, 24, 16, 0.45)",
          }}
        >
          홀덤 커뮤니티
        </h1>
        <p className="mt-3 max-w-sm text-sm font-semibold leading-6 text-[#FFF8EE] sm:text-base" style={{ textShadow: "0 1px 2px rgba(43, 24, 16, 0.55)" }}>
          다양한 이야기와 정보가 모이는, 홀덤 플레이어들의 커뮤니티!
        </p>
      </div>
    </section>
  );
}
