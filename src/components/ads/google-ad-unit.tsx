"use client";

import { useEffect, useRef, useSyncExternalStore, type ReactNode } from "react";
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
  "board-bottom": "min-h-[100px] w-full",
  "home-bottom": "min-h-[100px] w-full",
  "home-mid": "min-h-[100px] w-full",
  "post-mid": "min-h-[100px] w-full",
  infeed: "min-h-[90px] w-full",
  sidebar: "mx-auto min-h-[250px] w-full max-w-[300px]",
  a1: "aspect-[2/1] w-full",
  a2: "aspect-[2/1] w-full",
  a3: "aspect-[2/1] w-full",
};

/** 화면 폭 조건(예: "(min-width: 1024px)")이 맞을 때만 true — 숨긴 칸에 광고를 만들지 않으려고 */
function useMedia(query: string | undefined) {
  return useSyncExternalStore(
    (cb) => {
      if (!query) return () => {};
      const m = window.matchMedia(query);
      m.addEventListener("change", cb);
      return () => m.removeEventListener("change", cb);
    },
    () => (query ? window.matchMedia(query).matches : true),
    () => !query,
  );
}

export function GoogleAdUnit({
  placement,
  className,
  fallback = null,
  media,
}: {
  placement: AdSensePlacement;
  className?: string;
  /** 이 화면 폭에서만 광고 칸을 만듦(예: PC 왼쪽 칸) */
  media?: string;
  /** 광고 단위 ID가 아직 없을 때 대신 보여줄 내용. 기본은 아무것도 그리지 않습니다. */
  fallback?: ReactNode;
}) {
  const client = adsensePublisherId();
  const unit = adsenseSlotId(placement);
  const ref = useRef<HTMLModElement>(null);
  const show = useMedia(media);

  useEffect(() => {
    if (!client || !unit || !show) return;
    // 화면에 안 보이는 칸(예: 휴대폰에서 숨긴 왼쪽 광고)은 광고를 부르지 않음
    if (!ref.current || ref.current.offsetWidth === 0) return;
    try {
      window.adsbygoogle = window.adsbygoogle ?? [];
      window.adsbygoogle.push({});
    } catch {
      /* AdSense 스크립트가 아직 없어도 레이아웃은 유지 */
    }
  }, [client, unit, show]);

  const frame = cn(
    "overflow-hidden rounded-xl border border-[#3a332c] bg-[#1C1819]",
    className,
  );

  if (client && unit && show) {
    return (
      <aside className={frame} aria-label="광고">
        <p className="border-b border-[#3a332c] bg-[#141110] px-3 py-1 text-center text-[11px] font-bold tracking-wide text-[#E5E7EB]">
          광고
        </p>
        <ins
          ref={ref}
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

  return fallback;
}
