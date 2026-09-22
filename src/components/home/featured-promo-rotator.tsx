"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon } from "lucide-react";
import { cn } from "cn";
import {
  HOME_PROMO_ROTATE_MS,
  HOME_PROMO_SLIDE_MS,
  buildLoopTrack,
  carouselCloneCount,
  loopTrackStartIndex,
  snapLoopIndex,
  type HomePromo,
} from "@/lib/promo-rotate";

function shuffle<T>(items: T[]) {
  const copy = items.slice();
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

const POSTER_FRAME = "aspect-[5/7]";

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function posterMark(tag?: string | null, isPaid?: boolean) {
  if (isPaid) return "AD";
  if (tag === "제휴" || tag === "협찬") return "제휴";
  return "제휴";
}

export function FeaturedPromoRotator({ pool }: { pool: HomePromo[] }) {
  const [deck, setDeck] = useState(pool);
  const cloneCount = carouselCloneCount(deck.length);
  const track = useMemo(() => buildLoopTrack(deck, cloneCount), [deck, cloneCount]);
  const startIndex = loopTrackStartIndex(cloneCount);

  const [index, setIndex] = useState(startIndex);
  const [instant, setInstant] = useState(false);
  const [paused, setPaused] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const lockedRef = useRef(false);
  const indexRef = useRef(index);

  useEffect(() => {
    setDeck(shuffle(pool));
  }, [pool]);

  useEffect(() => {
    indexRef.current = index;
  }, [index]);

  useEffect(() => {
    setIndex(startIndex);
    setInstant(true);
    lockedRef.current = false;
    const reset = window.setTimeout(() => setInstant(false), 0);
    return () => window.clearTimeout(reset);
  }, [deck, startIndex]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduceMotion(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  const finishLoop = useCallback(
    (nextIndex: number) => {
      const snapped = snapLoopIndex(nextIndex, deck.length, cloneCount);
      if (snapped === null) {
        lockedRef.current = false;
        return;
      }
      setInstant(true);
      setIndex(snapped);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setInstant(false);
          lockedRef.current = false;
        });
      });
    },
    [cloneCount, deck.length],
  );

  const move = useCallback(
    (delta: number) => {
      if (deck.length <= 1 || lockedRef.current) return;
      lockedRef.current = true;
      const nextIndex = indexRef.current + delta;
      if (reduceMotion || prefersReducedMotion()) {
        const snapped = snapLoopIndex(nextIndex, deck.length, cloneCount) ?? nextIndex;
        setInstant(true);
        setIndex(snapped);
        requestAnimationFrame(() => {
          setInstant(false);
          lockedRef.current = false;
        });
        return;
      }
      setIndex(nextIndex);
    },
    [cloneCount, deck.length, reduceMotion],
  );

  useEffect(() => {
    if (paused || reduceMotion || deck.length <= 1) return;

    const timer = window.setInterval(() => {
      if (document.hidden) return;
      move(1);
    }, HOME_PROMO_ROTATE_MS);

    return () => window.clearInterval(timer);
  }, [paused, reduceMotion, deck.length, move]);

  if (pool.length === 0) {
    return (
      <Link
        href="/advertise"
        className={`touch-target mx-auto flex ${POSTER_FRAME} max-w-sm flex-col items-center justify-center rounded-2xl border-2 border-dashed border-primary/45 bg-emerald-50/80 px-4 text-center`}
      >
        <span className="flex size-10 items-center justify-center rounded-full border border-primary text-primary">
          <PlusIcon className="size-5" />
        </span>
        <p className="mt-2 text-sm font-semibold text-emerald-900">홍보 포스터 등록</p>
      </Link>
    );
  }

  const canSlide = deck.length > 1;
  const duration = instant || reduceMotion ? 0 : HOME_PROMO_SLIDE_MS;

  return (
    <div
      className="group/promo relative"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="overflow-hidden">
        <ul
          className="flex [--promo-step:100%] sm:[--promo-step:33.333333%]"
          style={{
            transform: `translate3d(calc(-1 * ${index} * var(--promo-step)), 0, 0)`,
            transition: duration > 0 ? `transform ${duration}ms ease-in-out` : "none",
          }}
          onTransitionEnd={(event) => {
            if (event.target !== event.currentTarget) return;
            if (event.propertyName !== "transform") return;
            finishLoop(index);
          }}
        >
          {track.map((banner, trackIndex) => (
            <li
              key={`${banner.key}-${trackIndex}`}
              className="w-full shrink-0 px-1.5 sm:w-1/3"
            >
              <div className="mx-auto w-full max-w-[280px] sm:max-w-none">
                <PosterCard banner={banner} />
              </div>
            </li>
          ))}
        </ul>
      </div>

      {canSlide ? (
        <div
          className={cn(
            "pointer-events-none absolute inset-x-0 top-0 z-10 h-0 pb-[140%] sm:pb-[46.666%]",
            "opacity-100 transition-opacity duration-200",
            "group-focus-within/promo:opacity-100 group-hover/promo:opacity-100",
            "[@media(hover:hover)_and_(pointer:fine)]:opacity-0",
            "[@media(hover:hover)_and_(pointer:fine)]:group-focus-within/promo:opacity-100",
            "[@media(hover:hover)_and_(pointer:fine)]:group-hover/promo:opacity-100",
          )}
        >
          <div className="absolute inset-0 flex items-center justify-between px-0.5 sm:px-1">
            <CarouselArrow
              label="이전 포스터"
              onClick={() => move(-1)}
            >
              <ChevronLeftIcon className="size-6" />
            </CarouselArrow>
            <CarouselArrow
              label="다음 포스터"
              onClick={() => move(1)}
            >
              <ChevronRightIcon className="size-6" />
            </CarouselArrow>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function CarouselArrow({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onClick();
      }}
      className="pointer-events-auto flex size-11 items-center justify-center rounded-full bg-black/55 text-white shadow-md ring-1 ring-white/25 hover:bg-black/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      {children}
    </button>
  );
}

function PosterCard({ banner }: { banner: HomePromo }) {
  return (
    <Link
      href={banner.href}
      className="group block overflow-hidden rounded-2xl border border-border bg-card shadow-sm hover:border-primary/50"
    >
      <div className={`relative ${POSTER_FRAME} bg-black`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={banner.image} alt={banner.title} className="h-full w-full object-contain" />
        <div className="absolute top-2 left-2 flex items-center gap-1.5">
          <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-white">
            {banner.tag || "홍보"}
          </span>
          <span className="rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-bold tracking-wide text-white ring-1 ring-white/30">
            {posterMark(banner.tag, banner.isPaid)}
          </span>
        </div>
      </div>
      <div className="p-2.5">
        <h3 className="text-sm font-bold leading-snug">{banner.title}</h3>
        <p className="mt-1 truncate text-[11px] text-muted-foreground">{banner.location}</p>
        <span className="mt-2 inline-flex h-8 items-center rounded-full bg-primary px-3 text-[11px] font-semibold text-white">
          자세히 보기 →
        </span>
      </div>
    </Link>
  );
}
