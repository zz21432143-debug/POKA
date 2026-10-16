"use client";

import { useState } from "react";

/** 「🐢 렉 신고」: 2초 동안 화면 프레임을 재서 기기 정보와 함께 관리자에게 보냄 */
export function LagReportButton({ game, lite = false }: { game: "omok" | "yut"; lite?: boolean }) {
  const [state, setState] = useState<"idle" | "measuring" | "sent">("idle");
  const send = () => {
    if (state !== "idle") return;
    setState("measuring");
    let n = 0;
    const t0 = performance.now();
    const tick = () => {
      n += 1;
      if (performance.now() - t0 < 2000) requestAnimationFrame(tick);
      else {
        const fps = Math.round(n / ((performance.now() - t0) / 1000));
        void fetch("/api/games/lag", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ game, fps, lite, w: window.innerWidth, h: window.innerHeight, dpr: window.devicePixelRatio, path: location.pathname }),
        })
          .catch(() => undefined)
          .finally(() => setState("sent"));
      }
    };
    requestAnimationFrame(tick);
  };
  return (
    <button
      type="button"
      data-lag-report={state}
      onClick={send}
      disabled={state !== "idle"}
      title="화면이 끊기면 눌러 주세요(기기 · 속도 정보만 보내요)"
      className="arcade-btn btn-dark !min-h-9 shrink-0 px-2.5 text-sm"
    >
      {state === "measuring" ? "재는 중…" : state === "sent" ? "✅ 신고됨" : "🐢 렉 신고"}
    </button>
  );
}
