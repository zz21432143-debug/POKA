import Link from "next/link";

export function HomeHero() {
  return (
    <section className="hero-mint relative overflow-hidden rounded-3xl px-6 py-8 sm:px-8 sm:py-10">
      <p className="text-[11px] font-semibold tracking-[0.18em] text-emerald-700/80">
        POKA COMMUNITY
      </p>
      <h1 className="mt-3 max-w-md text-2xl font-bold tracking-tight text-slate-800 sm:text-[1.85rem] sm:leading-snug">
        오늘도 수고했어,
        <br />
        우리 모두 같은 길을 걷는 중이야.
      </h1>
      <p className="mt-3 max-w-sm text-sm leading-6 text-slate-500">
        딜러로서의 고민, 이야기, 경험을 자유롭게 나눠보세요.
        여기서는 누구나 공감받을 거예요.
      </p>
      <Link
        href="/boards/free/write"
        className="touch-target mt-6 inline-flex min-h-11 items-center rounded-full bg-primary px-5 text-sm font-semibold text-white shadow-sm hover:bg-primary/90"
      >
        지금 바로 글쓰기 →
      </Link>
      <p
        className="pointer-events-none absolute right-6 top-8 hidden rotate-[-8deg] text-4xl font-semibold text-emerald-600/50 sm:block"
        style={{ fontFamily: "var(--font-script), cursive" }}
      >
        Better
        <br />
        Together
      </p>
    </section>
  );
}
