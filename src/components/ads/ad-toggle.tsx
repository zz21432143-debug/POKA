"use client";

import { createContext, useContext, type ReactNode } from "react";
import { adsenseSlotId, type AdSensePlacement } from "@/lib/adsense";

/** 관리자가 끈 광고 구좌(사이트 설정 adsOffJson) — 광고 칸이 이걸 보고 그리지 않음 */
const AdOffContext = createContext<ReadonlySet<string>>(new Set());

/** 관리자 화면에서 넣은 광고 단위 ID */
const AdSlotsContext = createContext<Record<string, string>>({});

export function AdOffProvider({ off, slots = {}, children }: { off: string[]; slots?: Record<string, string>; children: ReactNode }) {
  return (
    <AdOffContext.Provider value={new Set(off)}>
      <AdSlotsContext.Provider value={slots}>{children}</AdSlotsContext.Provider>
    </AdOffContext.Provider>
  );
}

/** 이 자리의 광고 단위 ID(저장값 → 환경변수 → 기본) — 없으면 "" */
export function useAdSlot(placement: AdSensePlacement) {
  return adsenseSlotId(placement, useContext(AdSlotsContext));
}

/** 광고 단위 ID가 있고 켜진 자리일 때만 안을 그림(빈 칸이 남지 않게) */
export function AdIfSlot({ placement, children }: { placement: AdSensePlacement | AdSensePlacement[]; children: ReactNode }) {
  const slots = useContext(AdSlotsContext);
  const off = useContext(AdOffContext);
  const list = Array.isArray(placement) ? placement : [placement];
  return list.some((p) => !off.has(p) && adsenseSlotId(p, slots)) ? <>{children}</> : null;
}

export function useAdOff(placement: string) {
  return useContext(AdOffContext).has(placement);
}
