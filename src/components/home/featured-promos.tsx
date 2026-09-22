import Link from "next/link";
import { FEATURED_PROMOS } from "@/lib/featured-promos";
import { MegaphoneIcon } from "lucide-react";
import { cn } from "cn";

const TONE: Record<string, string> = {
  city: "from-[#1a1430] via-[#3b2a1a] to-[#0f172a]",
  spring: "from-[#4c1d3d] via-[#7a2e4d] to-[#1f2933]",
  fit: "from-[#111827] via-[#1f2937] to-[#0b1220]",
  hotel: "from-[#1e1b16] via-[#3f3a2e] to-[#0f172a]",
  paper: "from-[#3f3a32] via-[#6b6256] to-[#1f2937]",
  welcome: "from-[#052e1c] via-[#064e3b] to-[#022c22]",
};

export function FeaturedPromos() {
  return (
    <section>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <MegaphoneIcon className="size-4 text-primary" />
          지금, 진행중인 홍보 게시물
        </h2>
        <Link href="/boards/official" className="text-xs text-muted-foreground hover:text-primary">
          전체보기
        </Link>
      </div>
      <p className="mb-3 text-xs text-muted-foreground">
        딜러들을 위한 다양한 채용 · 모집 · 이벤트 소식을 확인해보세요!
      </p>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {FEATURED_PROMOS.map((card) => (
          <li key={card.id}>
            <Link
              href={card.href}
              className={cn(
                "group relative flex min-h-[11.5rem] flex-col overflow-hidden rounded-2xl bg-gradient-to-br p-4 text-white shadow-sm",
                TONE[card.tone],
              )}
            >
              <div className="pointer-events-none absolute inset-0 opacity-40">
                <div className="absolute -right-6 -bottom-10 size-36 rounded-full bg-white/10 blur-2xl" />
                <div className="absolute top-6 right-8 size-16 rounded-full border border-white/20" />
              </div>
              <span className="relative z-[1] inline-flex items-center gap-1.5">
                <span className="inline-flex w-fit rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold">
                  {card.tag}
                </span>
                {"sponsorMark" in card && card.sponsorMark ? (
                  <span className="inline-flex rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-bold tracking-wide text-white ring-1 ring-white/35">
                    {card.sponsorMark}
                  </span>
                ) : null}
              </span>
              <h3 className="relative z-[1] mt-3 whitespace-pre-line text-[15px] font-bold leading-snug">
                {card.title}
              </h3>
              <p className="relative z-[1] mt-2 text-xs text-white/80">{card.desc}</p>
              <div className="relative z-[1] mt-auto flex items-end justify-between gap-2 pt-4">
                <p className="text-[10px] text-white/60">{card.meta}</p>
                <span className="inline-flex h-7 items-center rounded-full bg-primary px-3 text-[11px] font-semibold">
                  {card.cta} →
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
