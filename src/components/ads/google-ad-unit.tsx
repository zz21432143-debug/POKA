"use client";

import { useEffect } from "react";
import { adsensePublisherId, adsenseSlotId, type AdSensePlacement } from "@/lib/adsense";
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
  a1: "aspect-[2/1] w-full",
  a2: "aspect-[2/1] w-full",
  a3: "aspect-[2/1] w-full",
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

  const frame = cn(
    "overflow-hidden rounded-xl border border-[#3a332c] bg-[#1C1819]",
    className,
  );

  if (client && unit) {
    return (
      <aside className={frame} aria-label="광고">
        <p className="border-b border-[#3a332c] bg-[#141110] px-3 py-1 text-center text-[11px] font-bold tracking-wide text-[#E5E7EB]">
          광고
        </p>
        <ins
          className={cn("adsbygoogle block", SIZE[placement])}
          style={{ display: "block" }}
          data-ad-client={client}
          data-ad-slot={unit}
          data-ad-format={placement === "sidebar" ? "rectangle" : placement.startsWith("a") ? "rectangle" : "horizontal"}
          data-full-width-responsive="true"
        />
      </aside>
    );
  }

  return null;
}
