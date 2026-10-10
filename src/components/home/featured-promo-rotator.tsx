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

const POSTER_FRAME = "aspect-[5/7]";

function posterMark(tag?: string | null, isPaid?: boolean) {
  if (isPaid) return "AD";
  if (tag === "제휴" || tag === "협찬") return "제휴";
  return "제휴";
}

export function FeaturedPromoRotator({ pool }: { pool: HomePromo[] }) {
  if (pool.length === 0) {
    return (
      <Link
        href="/advertise"
        className={`touch-target mx-auto flex ${POSTER_FRAME} max-w-sm flex-col items-center justify-center rounded-2xl border-2 border-dashed border-primary/45 bg-emerald-950/40 px-4 text-center`}
      >
        <span className="flex size-10 items-center justify-center rounded-full border border-primary text-primary">
          <PlusIcon className="size-5" />
        </span>
        <p className="mt-2 text-sm font-semibold text-emerald-300">홍보 포스터 등록</p>
      </Link>
    );
  }

  return <PromoCarousel deck={pool} />;
}

function PromoCarousel({ deck }: { deck: HomePromo[] }) {
  const cloneCount = carouselCloneCount(deck.length);
  const track = useMemo(() => buildLoopTrack(deck, cloneCount), [deck, cloneCount]);
  const startIndex = loopTrackStartIndex(cloneCount);

  const [index, setIndex] = useState(startIndex);
  const [animate, setAnimate] = useState(true);
  const lockedRef = useRef(false);
  const indexRef = useRef(startIndex);
  const unlockTimer = useRef<number>(0);

  const settle = useCallback(() => {
    const snapped = snapLoopIndex(indexRef.current, deck.length, cloneCount);
    if (snapped !== null) {
      setAnimate(false);
      indexRef.current = snapped;
      setIndex(snapped);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setAnimate(true));
      });
    }
    lockedRef.current = false;
  }, [cloneCount, deck.length]);

  const move = useCallback(
    (delta: number) => {
      if (deck.length <= 1 || lockedRef.current) return;
      lockedRef.current = true;
      const next = indexRef.current + delta;
      indexRef.current = next;
      setIndex(next);
      window.clearTimeout(unlockTimer.current);
      unlockTimer.current = window.setTimeout(settle, HOME_PROMO_SLIDE_MS);
    },
    [deck.length, settle],
  );

  useEffect(() => {
    if (deck.length <= 1) return;
    const timer = window.setInterval(() => {
      if (document.hidden) return;
      move(1);
    }, HOME_PROMO_ROTATE_MS);
    return () => window.clearInterval(timer);
  }, [deck.length, move]);

  useEffect(() => () => window.clearTimeout(unlockTimer.current), []);

  const canSlide = deck.length > 1;
  const duration = animate ? HOME_PROMO_SLIDE_MS : 0;

  return (
    <div className="group/promo relative">
      <div className="overflow-hidden">
        <ul
          className="flex [--visible:1] sm:[--visible:3]"
          style={{
            width: `calc(${track.length} * 100% / var(--visible))`,
            transform: `translate3d(calc(-1 * ${index} * 100% / ${track.length}), 0, 0)`,
            transition: duration > 0 ? `transform ${duration}ms ease-in-out` : "none",
            willChange: "transform",
          }}
        >
          {track.map((banner, trackIndex) => (
            <li
              key={`${banner.key}-${trackIndex}`}
              className="shrink-0 px-1.5"
              style={{ width: `${100 / track.length}%` }}
            >
              <div className="mx-auto w-full max-w-[280px] sm:max-w-none">
                <PosterCard banner={banner} />
              </div>
            </li>
          ))}
        </ul>
      </div>

      {canSlide ? (
        <div className="pointer-events-none absolute inset-0 z-10 hidden items-center justify-between px-1 sm:flex">
          <CarouselArrow label="이전 포스터" onClick={() => move(-1)}>
            <ChevronLeftIcon className="size-7" />
          </CarouselArrow>
          <CarouselArrow label="다음 포스터" onClick={() => move(1)}>
            <ChevronRightIcon className="size-7" />
          </CarouselArrow>
        </div>
      ) : null}

      {canSlide ? (
        <div className="mt-3 flex justify-center gap-8 sm:hidden">
          <CarouselArrow label="이전 포스터" onClick={() => move(-1)}>
            <ChevronLeftIcon className="size-6" />
          </CarouselArrow>
          <CarouselArrow label="다음 포스터" onClick={() => move(1)}>
            <ChevronRightIcon className="size-6" />
          </CarouselArrow>
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
      className={cn(
        "pointer-events-auto flex size-12 items-center justify-center rounded-full",
        "bg-black/60 text-white shadow-lg ring-1 ring-white/30 backdrop-blur-sm",
        "hover:bg-black/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
      )}
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
