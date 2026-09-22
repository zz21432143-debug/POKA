"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { PlusIcon } from "lucide-react";
import { cn } from "cn";
import {
  HOME_PROMO_ROTATE_MS,
  HOME_PROMO_VISIBLE,
  nextRotateSlot,
  pickReplacement,
  type HomePromo,
} from "@/lib/promo-rotate";

const POSTER_FRAME = "aspect-[5/7]";

function posterMark(tag?: string | null, isPaid?: boolean) {
  if (isPaid) return "AD";
  if (tag === "제휴" || tag === "협찬") return "제휴";
  return "제휴";
}

export function FeaturedPromoRotator({ pool }: { pool: HomePromo[] }) {
  const start = useMemo(() => pool.slice(0, HOME_PROMO_VISIBLE), [pool]);
  const [visible, setVisible] = useState(start);
  const [flashSlot, setFlashSlot] = useState<number | null>(null);
  const [paused, setPaused] = useState(false);
  const slotRef = useRef(0);

  useEffect(() => {
    setVisible(pool.slice(0, HOME_PROMO_VISIBLE));
    slotRef.current = 0;
  }, [pool]);

  useEffect(() => {
    if (paused || pool.length <= HOME_PROMO_VISIBLE) return;
    const reduce =
      typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;

    const tick = () => {
      if (document.hidden) return;
      const currentSlot = slotRef.current;
      setVisible((current) => {
        const incoming = pickReplacement(current, pool, currentSlot);
        if (!incoming) return current;
        const next = [...current];
        next[currentSlot] = incoming;
        setFlashSlot(currentSlot);
        return next;
      });
      slotRef.current = nextRotateSlot(currentSlot, HOME_PROMO_VISIBLE);
    };

    const timer = window.setInterval(tick, HOME_PROMO_ROTATE_MS);
    return () => window.clearInterval(timer);
  }, [paused, pool]);

  useEffect(() => {
    if (flashSlot === null) return;
    const timer = window.setTimeout(() => setFlashSlot(null), 700);
    return () => window.clearTimeout(timer);
  }, [flashSlot]);

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

  return (
    <ul
      className="grid grid-cols-1 gap-3 sm:grid-cols-3"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {visible.map((banner, index) => (
        <li key={`slot-${index}`} className="mx-auto w-full max-w-[280px] sm:max-w-none">
          <div className="overflow-hidden rounded-2xl">
            <div
              key={banner.key}
              className={cn(
                flashSlot === index ? "animate-in fade-in slide-in-from-bottom-4 duration-500" : null,
              )}
            >
              <PosterCard banner={banner} />
            </div>
          </div>
        </li>
      ))}
    </ul>
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
