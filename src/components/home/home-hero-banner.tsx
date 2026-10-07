export function HomeHeroBanner() {
  return (
    <section
      aria-label="POKA 소개"
      className="relative overflow-hidden rounded-2xl bg-[#07150f] shadow-[0_12px_40px_-18px_rgb(6_21_15_/_0.7)]"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_80%_at_12%_0%,rgba(34,197,94,0.28),transparent_52%),radial-gradient(90%_70%_at_88%_100%,rgba(16,185,129,0.18),transparent_48%)]"
      />
      <div className="relative flex flex-col items-center gap-3 px-5 py-8 text-center sm:flex-row sm:gap-6 sm:px-8 sm:py-10 sm:text-left">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/poka-mark.svg"
          alt=""
          width={88}
          height={88}
          className="size-16 shrink-0 sm:size-[4.5rem]"
        />
        <div className="min-w-0">
          <p className="text-[11px] font-semibold tracking-[0.28em] text-emerald-300/90">HOLDEM COMMUNITY</p>
          <h1 className="mt-1 text-4xl font-black tracking-tight text-white sm:text-5xl">POKA</h1>
          <p className="mt-2 text-base font-semibold text-emerald-50 sm:text-lg">포커를 더 즐겁게</p>
          <p className="text-sm text-emerald-100/80 sm:text-base">함께하는 공간</p>
        </div>
      </div>
    </section>
  );
}
