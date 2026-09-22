"use client";

import { useEffect } from "react";
import { adsensePublisherId, adsenseSlotId, GOOGLE_REMNANT_MOCKS, type AdSensePlacement } from "@/lib/adsense";
import { cn } from "@/lib/utils";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

const SIZE: Record<AdSensePlacement, string> = {
  "post-top": "min-h-[90px] w-full",
  "post-bottom": "min-h-[90px] w-full",
  sidebar: "mx-auto min-h-[250px] w-full max-w-[300px]",
};

export function GoogleAdUnit({
  placement,
  className,
}: {
  placement: AdSensePlacement;
  className?: string;
}) {
  const client = adsensePublisherId();
  const unit = adsenseSlotId(placement);

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
      <aside
        className={cn("overflow-hidden rounded-xl border border-border bg-card", className)}
        aria-label="Google 광고"
      >
        <p className="px-2 pt-1 text-[10px] font-medium tracking-wide text-muted-foreground">광고</p>
        <ins
          className={cn("adsbygoogle block", SIZE[placement])}
          style={{ display: "block" }}
          data-ad-client={client}
          data-ad-slot={unit}
          data-ad-format={placement === "sidebar" ? "rectangle" : "horizontal"}
          data-full-width-responsive="true"
        />
      </aside>
    );
  }

  const mock = GOOGLE_REMNANT_MOCKS[placement];

  return (
    <aside
      className={cn(
        "relative flex flex-col justify-end overflow-hidden rounded-xl border border-border bg-gradient-to-br px-3 py-2.5",
        SIZE[placement],
        mock.tone,
        className,
      )}
      data-ad-network="google"
      data-ad-placement={placement}
      aria-label="Google 잔여 광고(데모)"
    >
      <span className="absolute top-1.5 left-1.5 rounded bg-white/90 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-neutral-600 ring-1 ring-black/10">
        광고 · Google
      </span>
      <p className="text-[10px] font-semibold tracking-wide text-neutral-500">{mock.kicker}</p>
      <p className="mt-0.5 text-sm font-semibold leading-tight text-neutral-900">{mock.title}</p>
      <p className="mt-0.5 text-[10px] text-neutral-500">{mock.line}</p>
    </aside>
  );
}
