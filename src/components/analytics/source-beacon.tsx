"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/** 다른 사이트 주소 → 출처 이름 */
const REFERRERS: [RegExp, string][] = [
  [/(^|\.)google\./, "google"],
  [/(^|\.)naver\.com$/, "naver"],
  [/(^|\.)daum\.net$/, "daum"],
  [/(^|\.)(kakao\.com|kakaocdn\.net)$/, "kakao"],
  [/(^|\.)instagram\.com$/, "instagram"],
  [/(^|\.)threads\.(net|com)$/, "threads"],
  [/(^|\.)(facebook\.com|fb\.com)$/, "facebook"],
  [/(^|\.)(youtube\.com|youtu\.be)$/, "youtube"],
  [/(^|\.)band\.us$/, "band"],
];

/**
 * 어디서 들어왔는지 알리기(관리자 「유입 경로」): ?from= · ?utm_source= · 초대 링크(/i/코드, ?ref=) · 다른 사이트에서 온 링크.
 * 같은 출처는 하루 한 번만. 아무 표시 없이 직접 들어오면 보내지 않음.
 */
export function SourceBeacon() {
  const pathname = usePathname();
  useEffect(() => {
    const url = new URL(window.location.href);
    const ref =
      url.searchParams.get("ref") ??
      pathname.match(/^\/i\/([a-z0-9]{6})$/i)?.[1] ??
      "";
    let src = (
      url.searchParams.get("from") ??
      url.searchParams.get("utm_source") ??
      ""
    )
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "")
      .slice(0, 24);
    if (!src && !ref && document.referrer) {
      try {
        const host = new URL(document.referrer).hostname;
        if (host && host !== window.location.hostname)
          src = REFERRERS.find(([re]) => re.test(host))?.[1] ?? "other-site";
      } catch {
        /* 주소가 이상하면 무시 */
      }
    }
    if (!src && !ref) return;
    const day = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Seoul",
    }).format(new Date());
    const key = `poka-src-${day}-${ref ? `ref-${ref}` : src}`;
    try {
      if (window.localStorage.getItem(key)) return;
      window.localStorage.setItem(key, "1");
    } catch {
      /* 저장소를 못 쓰면 매번 보냄(서버 집계는 그대로) */
    }
    void fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ src, ref }),
      keepalive: true,
    }).catch(() => undefined);
  }, [pathname]);
  return null;
}
