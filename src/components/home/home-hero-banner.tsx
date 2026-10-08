export function HomeHeroBanner() {
  return (
    <section
      aria-label="POKA 소개"
      className="relative min-h-[16rem] overflow-hidden rounded-[1.4rem] border-[3px] border-[#8d5a32] shadow-[0_6px_0_#6b4124] sm:min-h-[18rem]"
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
      <div className="relative flex min-h-[16rem] max-w-[28rem] flex-col justify-center bg-gradient-to-r from-[#fff6df]/85 via-[#fff6df]/40 to-transparent px-5 py-6 sm:min-h-[18rem] sm:px-7">
        <p className="text-sm font-black tracking-[0.18em] text-[#fff6d8] drop-shadow-[0_2px_0_#5c3a1e] sm:text-base">
          POKA
        </p>
        <h1
          className="mt-1 text-4xl leading-tight text-[#fff4cc] drop-shadow-[0_3px_0_#6b4424] sm:text-5xl sm:whitespace-nowrap"
          style={{ fontFamily: "var(--font-display), var(--font-sans), sans-serif" }}
        >
          홀덤 커뮤니티
        </h1>
        <p className="mt-3 max-w-sm text-sm font-bold leading-6 text-[#3d2918] sm:text-base">
          다양한 이야기와 정보가 모이는, 홀덤 플레이어들의 커뮤니티!
        </p>
      </div>
    </section>
  );
}
