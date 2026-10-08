import Link from "next/link";
import {
  BriefcaseIcon,
  CalendarDaysIcon,
  BookOpenIcon,
  MessageCircleIcon,
  SpadeIcon,
} from "lucide-react";

const HERO_CHIPS = [
  { href: "/community", title: "커뮤니티", icon: MessageCircleIcon },
  { href: "/boards/hand-review", title: "핸드리뷰", icon: SpadeIcon },
  { href: "/boards/jobs", title: "딜러 구인·구직", icon: BriefcaseIcon },
  { href: "/info", title: "정보센터", icon: BookOpenIcon },
  { href: "/boards/schedule", title: "이벤트", icon: CalendarDaysIcon },
] as const;

export function HomeHeroBanner() {
  return (
    <section
      aria-label="POKA 소개"
      className="grid overflow-hidden rounded-[1.6rem] border border-[#cfc3ac] shadow-[0_12px_32px_rgb(60_40_16_/_0.12)] sm:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]"
    >
      <div className="flex flex-col justify-center bg-[#0c3d2c] px-5 py-6 sm:px-7 sm:py-8">
        <div className="flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/poka-cloud.svg" alt="" width={40} height={40} className="size-10 shrink-0" />
          <div>
            <p className="text-lg font-black tracking-wide text-white">POKA</p>
            <p className="text-[10px] font-bold tracking-[0.18em] text-emerald-200/90">POKER COMMUNITY</p>
          </div>
        </div>
        <h1
          className="mt-4 text-[2.15rem] leading-none text-[#9fe8c4] sm:text-[2.65rem]"
          style={{ fontFamily: "var(--font-script), cursive" }}
        >
          홀덤 커뮤니티
        </h1>
        <p className="mt-3 max-w-md text-sm font-medium leading-6 text-white">
          다양한 이야기와 정보가 모이는, 홀덤 플레이어들의 커뮤니티!
        </p>
        <ul className="mt-4 flex max-w-xl flex-wrap gap-1.5">
          {HERO_CHIPS.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="touch-target relative z-10 inline-flex min-h-8 items-center gap-1.5 rounded-full bg-white px-3 text-[11px] font-semibold text-[#0d3b24] shadow-sm hover:bg-emerald-50"
              >
                <item.icon className="size-3.5 text-primary" />
                {item.title}
              </Link>
            </li>
          ))}
        </ul>
      </div>
      <div className="relative min-h-[10.5rem] bg-[#0c3d2c] sm:min-h-full">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/hero/poka-hero.webp"
          srcSet="/images/hero/poka-hero-1280.webp 1280w, /images/hero/poka-hero.webp 2170w"
          sizes="(max-width: 1320px) 50vw, 560px"
          alt="홀덤 커뮤니티 POKA — 포커를 더 즐겁게, 함께하는 공간"
          width={2170}
          height={725}
          fetchPriority="high"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover object-[72%_center]"
        />
      </div>
    </section>
  );
}
