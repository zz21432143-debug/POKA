"use client";

import { useEffect, useRef, useSyncExternalStore, type ReactNode } from "react";
import { adsensePublisherId, type AdSensePlacement } from "@/lib/adsense";
import { cn } from "@/lib/utils";
import { useAdOff, useAdSlot } from "@/components/ads/ad-toggle";

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
  // 메인 상단: 휴대폰 320x100 · PC 가로 배너(반응형)
  "home-top": "min-h-[100px] w-full",
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
  const unit = useAdSlot(placement);
  const ref = useRef<HTMLModElement>(null);
  const off = useAdOff(placement);
  const show = useMedia(media) && !off;

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
    // 실제로 채워졌는지(data-ad-status) 자리마다 하루 한 번만 알려 줌 — 관리 화면 「실제 노출」
    const el = ref.current;
    const key = `poka-ad-fill-${placement}-${new Date().toISOString().slice(0, 10)}`;
    try {
      if (localStorage.getItem(key)) return;
    } catch {
      return;
    }
    const report = () => {
      const status = el.getAttribute("data-ad-status");
      if (status !== "filled" && status !== "unfilled") return false;
      try {
        localStorage.setItem(key, "1");
      } catch {
        /* 무시 */
      }
      void fetch("/api/ads/fill", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ placement, filled: status === "filled" }), keepalive: true }).catch(() => undefined);
      return true;
    };
    if (report()) return;
    const mo = new MutationObserver(() => {
      if (report()) mo.disconnect();
    });
    mo.observe(el, { attributes: true, attributeFilter: ["data-ad-status"] });
    const stop = window.setTimeout(() => mo.disconnect(), 30_000);
    return () => {
      mo.disconnect();
      window.clearTimeout(stop);
    };
  }, [client, unit, show, placement]);

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
