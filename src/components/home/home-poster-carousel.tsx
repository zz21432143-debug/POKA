"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MegaphoneIcon, PlusIcon } from "lucide-react";
import { shuffleInPlaceCopy } from "@/lib/promo-rotate";
import { sizedImage } from "@/lib/image-url";

/** 한 번 바뀐 뒤 다음에 바뀔 때까지의 간격 */
const STEP_MS = 3500;
/** 포스터 한 장이 흐려졌다 나타나는 시간 */
const FADE_MS = 380;
/** 왼쪽부터 차례로 바뀌는 간격(물결처럼) */
const STAGGER_MS = 110;
/** 한 번에 보이는 포스터(넓은 화면 4장 · 그보다 좁으면 앞의 3장) */
const VISIBLE = 4;

export type HomePoster = {
  key: string;
  href: string;
  title: string;
  image: string | null;
  mark: string;
  slot: number;
  /** true면 포스터 그림만(표시 딱지·제목 띠 없이). 글자가 이미 들어간 이벤트 포스터용 */
  plain?: boolean;
};

/**
 * 홈 상단 포스터 6구좌. 한 줄 3장을 보여 주고 3.5초마다 한 칸씩 넘깁니다.
 * 옆으로 미끄러지면 어지럽다는 의견이 있어, 제자리에서 왼쪽부터 차례로 부드럽게 바뀝니다(살짝 흐려졌다 나타남).
 * 들어올 때마다 순서를 섞고, PC에서 마우스가 올라가 있어도 계속 돕니다.
 */
/** 빈 구좌마다 다른 문구 */
const VACANT_LINES = ["매장 홍보 환영", "대회 · 이벤트 홍보", "딜러팀 모집 홍보", "브랜드 · 유튜버 홍보", "오픈 · 리뉴얼 홍보", "시즌 대회 홍보"];

export function HomePosterCarousel({ posters }: { posters: HomePoster[] }) {
  const [deck, setDeck] = useState(posters);
  // 비어 있는 구좌 수(무료 홍보 포스터로 채운 칸) — 광고 맡길 자리 안내
  const empty = posters.filter((p) => p.plain).length;
  const [start, setStart] = useState(0);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    // 서버와 첫 화면을 맞춘 뒤, 브라우저에서 방문마다 순서를 섞습니다.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDeck(shuffleInPlaceCopy(posters));
  }, [posters]);

  useEffect(() => {
    if (deck.length <= VISIBLE) return;
    let swap = 0;
    let show = 0;
    const timer = window.setInterval(() => {
      if (document.hidden) return;
      setHidden(true);
      // 마지막(오른쪽) 포스터까지 다 흐려진 뒤 다음 포스터로 바꾸고 다시 나타나게 합니다.
      swap = window.setTimeout(() => {
        setStart((value) => (value + 1) % deck.length);
        show = window.setTimeout(() => setHidden(false), 30);
      }, FADE_MS + STAGGER_MS * (VISIBLE - 1));
    }, STEP_MS);
    return () => {
      window.clearInterval(timer);
      window.clearTimeout(swap);
      window.clearTimeout(show);
    };
  }, [deck.length]);

  const visible = Array.from({ length: Math.min(VISIBLE, deck.length) }, (_, i) => deck[(start + i) % deck.length]);

  return (
    <section aria-label="홍보 포스터" className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2 px-0.5">
        <h2 className="inline-flex items-center gap-1.5 text-sm font-bold text-white">
          <MegaphoneIcon className="size-4 text-[#C59B27]" />
          홍보 포스터
        </h2>
        <Link href="/advertise" className="more-link">
          포스터 홍보 문의{empty ? ` · 빈 자리 ${empty}` : ""}
        </Link>
      </div>
      <ul className="grid grid-cols-3 gap-2 lg:grid-cols-4">
        {visible.map((poster, position) => (
          <li
            key={`slot-${position}`}
            className={position === 3 ? "hidden lg:block" : undefined}
            style={{
              opacity: hidden ? 0 : 1,
              transform: hidden ? "scale(0.97)" : "scale(1)",
              transition: `opacity ${FADE_MS}ms ease ${position * STAGGER_MS}ms, transform ${FADE_MS}ms ease ${position * STAGGER_MS}ms`,
            }}
          >
            <PosterCard poster={poster} focusable />
          </li>
        ))}
      </ul>
      {deck.length > VISIBLE ? (
        <div className="flex justify-center gap-1.5" aria-hidden>
          {deck.map((poster, i) => (
            <span
              key={poster.key}
              className={i === start ? "h-1.5 w-4 rounded-full bg-[#c9a25c] transition-all" : "size-1.5 rounded-full bg-white/25 transition-all"}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}

function PosterCard({ poster, focusable }: { poster: HomePoster; focusable: boolean }) {
  const tabIndex = focusable ? undefined : -1;
  if (!poster.image) {
    return (
      <Link
        href="/advertise"
        tabIndex={tabIndex}
        className="flex aspect-[5/7] flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-[#c9a25c]/45 bg-black/45 px-2 text-center hover:border-[#c9a25c]/80"
      >
        <span className="flex size-8 items-center justify-center rounded-full border border-[#c9a25c]/70 text-[#e7c98a]">
          <PlusIcon className="size-4" />
        </span>
        <span className="text-[11px] font-semibold text-[#9CA3AF]">구좌 {poster.slot}</span>
        <span className="text-xs font-bold leading-tight text-[#f3eadb] sm:text-sm">포스터 홍보 자리</span>
      </Link>
    );
  }
  return (
    <Link
      href={poster.href}
      tabIndex={tabIndex}
      className="group relative block aspect-[5/7] overflow-hidden rounded-xl border border-white/10 bg-black"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={sizedImage(poster.image, 480)}
        alt={poster.title}
        loading="lazy"
        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
      />
      {poster.plain ? (
        // 빈 구좌: 자리 번호 · 구좌마다 다른 문구(같은 포스터 반복처럼 안 보이게)
        <>
          <span className="absolute inset-x-0 top-0 bg-black/75 px-2 py-1 text-center text-[11px] font-black tracking-wide text-[#f3d9a4] sm:text-xs">
            {poster.slot}번 구좌 · 비어 있음
          </span>
          <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent px-2 pt-6 pb-2 text-center text-[11px] leading-tight font-bold text-white sm:text-xs">
            {VACANT_LINES[(poster.slot - 1) % VACANT_LINES.length]}
            <span className="mt-0.5 block text-[#f3d9a4]">홍보 신청 →</span>
          </span>
        </>
      ) : (
        <>
          <span className="absolute top-1.5 left-1.5 rounded-full bg-black/65 px-1.5 py-0.5 text-[11px] font-bold text-white ring-1 ring-white/30">
            {poster.mark}
          </span>
          <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent px-2 pt-6 pb-1.5 text-[11px] font-semibold leading-tight text-white sm:text-xs">
            <span className="line-clamp-1">{poster.title}</span>
          </span>
        </>
      )}
    </Link>
  );
}
