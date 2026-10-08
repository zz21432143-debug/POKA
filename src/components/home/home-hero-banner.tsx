export function HomeHeroBanner() {
  return (
    <section
      aria-label="POKA 소개"
      className="relative min-h-[15.5rem] overflow-hidden rounded-2xl border border-black/50 shadow-[0_10px_28px_rgb(0_0_0/0.35)] sm:min-h-[17.5rem]"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/theme/yokai-hero.jpg"
        alt=""
        width={1280}
        height={720}
        fetchPriority="high"
        decoding="async"
        className="absolute inset-0 h-full w-full object-cover object-[68%_center]"
      />
      <div className="relative flex min-h-[15.5rem] max-w-[34rem] flex-col justify-center bg-gradient-to-r from-black/80 via-black/45 to-transparent px-6 py-6 sm:min-h-[17.5rem] sm:px-8">
        <h1
          className="text-[2.05rem] leading-[1.18] text-white sm:text-[2.7rem]"
          style={{
            fontFamily: "var(--font-display), var(--font-sans), sans-serif",
            textShadow: "0 2px 12px rgba(0, 0, 0, 0.55)",
          }}
        >
          108요괴가
          <br />
          다 튀어나왔다
        </h1>
        <p
          className="mt-3 max-w-[16rem] text-sm font-medium leading-6 text-[#f4eadf] sm:text-[15px]"
          style={{ textShadow: "0 1px 4px rgba(0, 0, 0, 0.65)" }}
        >
          평범한 하루였는데,
          <br />
          호리병이 깨지면서 108요괴가 나타났다!
        </p>
      </div>
    </section>
  );
}
