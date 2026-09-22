"use client";

import { useEffect } from "react";
import { adsensePublisherId, adsenseSlotId, GOOGLE_REMNANT_MOCKS } from "@/lib/adsense";
import { cn } from "@/lib/utils";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

export function GoogleAdUnit({ slot, className }: { slot: 1 | 2 | 3; className?: string }) {
  const client = adsensePublisherId();
  const unit = adsenseSlotId(slot);

  useEffect(() => {
    if (!client || !unit) return;
    try {
      window.adsbygoogle = window.adsbygoogle ?? [];
      window.adsbygoogle.push({});
    } catch {
      /* AdSense 스크립트가 아직 없어도 레이아웃은 유지 */
    }
  }, [client, unit]);

  if (client && unit) {
    return (
      <div
        className={cn("relative overflow-hidden rounded-xl border border-border bg-card", className)}
        aria-label={`A${slot} 구글 광고`}
      >
        <ins
          className="adsbygoogle block aspect-[2/1] w-full"
          style={{ display: "block" }}
          data-ad-client={client}
          data-ad-slot={unit}
          data-ad-format="rectangle"
          data-full-width-responsive="false"
        />
      </div>
    );
  }

  const mock = GOOGLE_REMNANT_MOCKS.find((item) => item.slot === slot) ?? GOOGLE_REMNANT_MOCKS[0];

  return (
    <div
      className={cn(
        "relative flex aspect-[2/1] w-full flex-col justify-end overflow-hidden rounded-xl border border-border bg-gradient-to-br px-3 py-2.5",
        mock.tone,
        className,
      )}
      data-ad-network="google"
      data-ad-fill="remnant-mock"
      aria-label={`A${slot} 구글 잔여 광고(데모)`}
    >
      <span className="absolute top-1.5 left-1.5 rounded bg-white/90 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-neutral-600 ring-1 ring-black/10">
        광고 · Google
      </span>
      <p className="text-[10px] font-semibold tracking-wide text-neutral-500">{mock.kicker}</p>
      <p className="mt-0.5 text-sm font-semibold leading-tight text-neutral-900 sm:text-[15px]">{mock.title}</p>
      <p className="mt-0.5 text-[10px] text-neutral-500">{mock.line}</p>
    </div>
  );
}
