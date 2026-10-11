"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { MegaphoneIcon, PlusIcon } from "lucide-react";
import {
  buildLoopTrack,
  carouselCloneCount,
  loopTrackStartIndex,
  shuffleInPlaceCopy,
  snapLoopIndex,
} from "@/lib/promo-rotate";

/** 한 칸 이동 뒤 멈춰 있는 시간까지 포함한 주기. */
const STEP_MS = 3200;
/** 한 칸 옆으로 미끄러지는 시간. 나머지(약 2.5초)는 멈춰서 보여줍니다. */
const SLIDE_MS = 700;
const VISIBLE = 3;

export type HomePoster = {
  key: string;
  href: string;
  title: string;
  image: string | null;
  mark: string;
  slot: number;
};

/** 홈 상단 포스터 6구좌. 한 줄 3장, 한 칸씩 밀렸다 멈추기를 반복하고 들어올 때마다 순서를 섞습니다. */
export function HomePosterCarousel({ posters }: { posters: HomePoster[] }) {
  const [deck, setDeck] = useState(posters);
  const cloneCount = carouselCloneCount(deck.length, VISIBLE);
  const track = useMemo(() => buildLoopTrack(deck, cloneCount), [deck, cloneCount]);
  const startIndex = loopTrackStartIndex(cloneCount);

  const [index, setIndex] = useState(startIndex);
  const [animate, setAnimate] = useState(true);
  const [paused, setPaused] = useState(false);
  const indexRef = useRef(startIndex);
  const settleTimer = useRef<number>(0);

  useEffect(() => {
    // 서버와 첫 화면을 맞춘 뒤, 브라우저에서 방문마다 순서를 섞습니다.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDeck(shuffleInPlaceCopy(posters));
  }, [posters]);

  const settle = useCallback(() => {
    const snapped = snapLoopIndex(indexRef.current, deck.length, cloneCount);
    if (snapped === null) return;
    setAnimate(false);
    indexRef.current = snapped;
    setIndex(snapped);
    requestAnimationFrame(() => requestAnimationFrame(() => setAnimate(true)));
  }, [cloneCount, deck.length]);

  useEffect(() => {
    if (deck.length <= VISIBLE || paused) return;
    const timer = window.setInterval(() => {
      if (document.hidden) return;
      indexRef.current += 1;
      setIndex(indexRef.current);
      window.clearTimeout(settleTimer.current);
      settleTimer.current = window.setTimeout(settle, SLIDE_MS + 20);
    }, STEP_MS);
    return () => window.clearInterval(timer);
  }, [deck.length, paused, settle]);

  useEffect(() => () => window.clearTimeout(settleTimer.current), []);

  return (
    <section aria-label="홍보 포스터" className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2 px-0.5">
        <h2 className="inline-flex items-center gap-1.5 text-sm font-bold text-white">
          <MegaphoneIcon className="size-4 text-[#C59B27]" />
          홍보 포스터
        </h2>
        <Link href="/advertise" className="more-link">
          포스터 홍보 문의
        </Link>
      </div>
      <div
        className="overflow-hidden"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocus={() => setPaused(true)}
        onBlur={() => setPaused(false)}
      >
        <ul
          className="flex"
          style={{
            width: `${(track.length * 100) / VISIBLE}%`,
            transform: `translate3d(${(-index * 100) / track.length}%, 0, 0)`,
            transition: animate ? `transform ${SLIDE_MS}ms ease-in-out` : "none",
            willChange: "transform",
          }}
        >
          {track.map((poster, trackIndex) => {
            const offscreen = trackIndex < index || trackIndex >= index + VISIBLE;
            return (
              <li
                key={`${poster.key}-${trackIndex}`}
                className="shrink-0 px-1"
                style={{ width: `${100 / track.length}%` }}
                aria-hidden={offscreen || undefined}
              >
                <PosterCard poster={poster} focusable={!offscreen} />
              </li>
            );
          })}
        </ul>
      </div>
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
        src={poster.image}
        alt={poster.title}
        loading="lazy"
        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
      />
      <span className="absolute top-1.5 left-1.5 rounded-full bg-black/65 px-1.5 py-0.5 text-[10px] font-bold text-white ring-1 ring-white/30">
        {poster.mark}
      </span>
      <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent px-2 pt-6 pb-1.5 text-[11px] font-semibold leading-tight text-white sm:text-xs">
        <span className="line-clamp-1">{poster.title}</span>
      </span>
    </Link>
  );
}
