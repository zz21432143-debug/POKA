export function HomeHeroBanner() {
  return (
    <section
      aria-label="POKA 소개"
      className="flex flex-col items-center gap-4 rounded-2xl bg-[#07150f] px-5 py-9 text-center shadow-[0_12px_40px_-18px_rgb(6_21_15_/_0.7)] sm:flex-row sm:gap-7 sm:px-10 sm:py-11 sm:text-left"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/poka-cloud.svg"
        alt=""
        width={128}
        height={128}
        fetchPriority="high"
        decoding="async"
        className="h-24 w-24 shrink-0 sm:h-32 sm:w-32"
      />
      <div className="min-w-0">
        <p className="text-[11px] font-semibold tracking-[0.28em] text-emerald-300/90">HOLDEM COMMUNITY</p>
        <h1 className="mt-1 text-4xl font-black tracking-tight text-white sm:text-5xl">POKA</h1>
        <p className="mt-2 text-base font-semibold text-emerald-50 sm:text-lg">포커를 더 즐겁게</p>
        <p className="text-sm text-emerald-100/80 sm:text-base">함께하는 공간</p>
      </div>
    </section>
  );
}
