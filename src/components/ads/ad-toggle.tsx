"use client";

import { createContext, useContext, type ReactNode } from "react";

/** 관리자가 끈 광고 구좌(사이트 설정 adsOffJson) — 광고 칸이 이걸 보고 그리지 않음 */
const AdOffContext = createContext<ReadonlySet<string>>(new Set());

export function AdOffProvider({ off, children }: { off: string[]; children: ReactNode }) {
  return <AdOffContext.Provider value={new Set(off)}>{children}</AdOffContext.Provider>;
}

export function useAdOff(placement: string) {
  return useContext(AdOffContext).has(placement);
}
