"use client";

import { useEffect } from "react";

const KEY = "poka-visit-day";

/** 하루 한 번 방문을 알립니다(관리자 통계용). 저장소를 못 쓰면 서버가 같은 날 중복을 걸러 줍니다. */
export function VisitBeacon() {
  useEffect(() => {
    const day = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date());
    try {
      if (window.localStorage.getItem(KEY) === day) return;
      window.localStorage.setItem(KEY, day);
    } catch {
      // 저장소를 못 쓰는 브라우저도 서버에서 하루 1회로 셉니다.
    }
    void fetch("/api/visit", { method: "POST", keepalive: true }).catch(() => undefined);
  }, []);
  return null;
}
