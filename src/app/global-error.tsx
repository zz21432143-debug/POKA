"use client";

import { useEffect } from "react";

export default function GlobalError({ reset }: { reset: () => void }) {
  useEffect(() => {
    const key = "poka-global-retry-at";
    const last = Number(sessionStorage.getItem(key) ?? 0);
    if (Date.now() - last < 12_000) return;
    sessionStorage.setItem(key, String(Date.now()));
    const id = window.setTimeout(() => reset(), 1600);
    return () => window.clearTimeout(id);
  }, [reset]);

  return (
    <html lang="ko">
      <body className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-[#07150f] px-6 text-center text-white">
        <p className="text-lg font-semibold">POKA를 불러오지 못했습니다.</p>
        <p className="text-sm text-white/70">서버가 잠시 잠들어 있습니다. 곧 다시 엽니다.</p>
        <button
          type="button"
          onClick={() => reset()}
          className="mt-2 inline-flex min-h-11 items-center rounded-full bg-emerald-500 px-5 text-sm font-semibold text-white"
        >
          다시 시도
        </button>
      </body>
    </html>
  );
}
