import Link from "next/link";
import { POKA_FEATURES, POKA_TAGLINE } from "@/lib/brand-copy";

/**
 * 홈 맨 위 대문(작게): 왼쪽 홍보 문구 + 바로가기, 오른쪽 POKA 마스코트 그림.
 * 예전 큰 그림(높이 절반 이상)을 줄여 첫 화면에 공고가 바로 보이게 합니다.
 */
export function HomeHero() {
  return (
    <section aria-label="POKA 하나로" className="relative overflow-hidden rounded-[1.35rem] border border-[#c9a25c]/40 bg-black">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/hero/poka-hero.webp"
        // 휴대폰은 작은 그림(24KB), 넓은 화면은 원본
        srcSet="/images/hero/poka-hero-720.webp 720w, /images/hero/poka-hero.webp 1254w"
        sizes="(min-width: 640px) 62vw, 78vw"
        alt=""
        aria-hidden
        width={1254}
        height={600}
        fetchPriority="high"
        className="absolute inset-y-0 right-0 h-full w-[78%] object-cover object-[70%_45%] sm:w-[62%]"
      />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,#0b0706_30%,rgba(11,7,6,.85)_52%,rgba(11,7,6,.15)_100%)]" />
      <div className="relative grid gap-2.5 px-4 py-4 sm:gap-3 sm:px-6 sm:py-6">
        <p className="hidden text-[11px] font-black tracking-[0.3em] text-[#c9a25c] sm:block">HOLDEM COMMUNITY · POKA</p>
        <h1 className="max-w-[17rem] text-[1.2rem] leading-snug font-black text-white sm:max-w-md sm:text-[1.9rem]">{POKA_TAGLINE}</h1>
        <ul className="flex max-w-md flex-wrap gap-1.5">
          {POKA_FEATURES.map((f) => (
            <li key={f.href}>
              <Link href={f.href} className="touch-target inline-flex min-h-10 items-center rounded-full border border-[#c9a25c]/50 bg-black/60 px-3 text-xs sm:min-h-9 sm:px-3 sm:text-[13px] font-bold text-[#f3d9a4] hover:border-[#c9a25c] hover:text-white">
                {f.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
