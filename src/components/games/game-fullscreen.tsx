"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

/** 지금 전체화면인지(브라우저 전체화면 API) */
function useIsFullscreen() {
  return useSyncExternalStore(
    (cb) => {
      document.addEventListener("fullscreenchange", cb);
      return () => document.removeEventListener("fullscreenchange", cb);
    },
    () => Boolean(document.fullscreenElement),
    () => false,
  );
}

/** 전체화면을 지원하는 브라우저인지(아이폰 사파리는 페이지 전체화면 미지원) */
function canFullscreen() {
  return typeof document !== "undefined" && Boolean(document.fullscreenEnabled && document.documentElement.requestFullscreen);
}

async function enterFullscreen(landscape = false) {
  try {
    await document.documentElement.requestFullscreen({ navigationUI: "hide" });
    // 안드로이드: 전체화면일 때만 화면 방향을 가로로 고정할 수 있음(아이폰 · PC는 조용히 넘어감)
    if (landscape) {
      const o = screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> };
      await o.lock?.("landscape").catch(() => undefined);
    }
  } catch {
    /* 사용자가 막았거나 지원 안 함 */
  }
}

async function exitFullscreen() {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
  } catch {
    /* 무시 */
  }
}

/** 방 위쪽 「⛶ 전체화면」 버튼(누를 때마다 켜기 · 끄기) — 지원 안 하는 기기에서는 안 보임 */
export function FullscreenButton({ className = "", landscape = false }: { className?: string; /** 안드로이드: 켜면 가로 고정(윷) */ landscape?: boolean }) {
  const on = useIsFullscreen();
  const supported = useSyncExternalStore(
    () => () => {},
    () => canFullscreen(),
    () => false,
  );
  if (!supported) return null;
  return (
    <button
      type="button"
      data-game-fullscreen
      aria-pressed={on}
      onClick={() => void (on ? exitFullscreen() : enterFullscreen(landscape))}
      className={`arcade-btn btn-dark !min-h-9 shrink-0 px-2.5 text-sm ${className}`}
    >
      {on ? "⛶ 전체화면 끄기" : "⛶ 전체화면"}
    </button>
  );
}

const LAND_QUERY = "(orientation: landscape) and (max-height: 520px)";

/** 휴대폰을 가로로 돌리면 판([data-land-snap])을 화면 맨 위로 맞춤 */
function useLandscapeSnap() {
  useEffect(() => {
    const mq = window.matchMedia?.(LAND_QUERY);
    if (!mq) return;
    const snap = () => {
      if (!mq.matches) return;
      window.requestAnimationFrame(() => document.querySelector("[data-land-snap]")?.scrollIntoView({ block: "start" }));
    };
    snap();
    mq.addEventListener("change", snap);
    return () => mq.removeEventListener("change", snap);
  }, []);
}

const PROMPT_KEY = "poka-game-fullscreen-asked";

/**
 * 오락실에 들어오면 한 번(이 탭에서) 전체화면을 권함.
 * 전체화면을 지원하지 않는 아이폰은 「홈 화면에 추가」 안내로 대신함.
 */
export function FullscreenPrompt({ landscape = false }: { landscape?: boolean }) {
  useLandscapeSnap();
  const on = useIsFullscreen();
  const [open, setOpen] = useState(false);
  const [ios, setIos] = useState(false);
  useEffect(() => {
    let asked = false;
    try {
      asked = window.sessionStorage.getItem(PROMPT_KEY) === "1";
    } catch {
      /* 못 읽으면 한 번 묻기 */
    }
    if (asked || document.fullscreenElement) return;
    const standalone = window.matchMedia?.("(display-mode: standalone)").matches;
    if (standalone) return;
    const apple = /iPhone|iPad|iPod/.test(navigator.userAgent);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 처음 들어왔을 때 한 번
    setIos(!canFullscreen() && apple);
    if (canFullscreen() || apple) setOpen(true);
  }, []);
  const close = () => {
    try {
      window.sessionStorage.setItem(PROMPT_KEY, "1");
    } catch {
      /* 저장 못 해도 닫음 */
    }
    setOpen(false);
  };
  if (!open || on || typeof document === "undefined") return null;
  return createPortal(
    <div data-game-fullscreen-prompt className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+5rem)] z-[95] mx-auto max-w-md lg:bottom-6">
      <div className="yut-cutin-card grid gap-2 rounded-2xl border-4 border-[#0a0614] bg-[#1a0f2e] p-4 shadow-[6px_6px_0_#0a0614]">
        <p className="text-base font-black text-[#ffe08a]">⛶ 전체화면으로 하면 더 잘 보여요</p>
        <p className="text-sm leading-6 text-[#ece4d6]">
          {ios
            ? "휴대폰을 가로로 돌리면 판이 화면 높이에 맞춰 크게 보여요. 사파리 공유 버튼 → 「홈 화면에 추가」로 POKA 앱을 열면 주소창까지 없앨 수 있어요."
            : landscape
              ? "판이 크게 보이고 주소창에 가려지지 않아요. 휴대폰은 가로 화면으로 바뀌어요. 끄려면 위쪽 「전체화면 끄기」나 뒤로 가기를 누르세요."
              : "판이 크게 보이고 주소창 · 알림에 가려지지 않아요. 끄려면 위쪽 「전체화면 끄기」나 뒤로 가기를 누르세요."}
        </p>
        <div className={ios ? "grid" : "grid grid-cols-2 gap-2"}>
          <button type="button" onClick={close} className="arcade-btn btn-dark min-h-11 text-sm">
            {ios ? "확인" : "나중에"}
          </button>
          {ios ? null : (
            <button
              type="button"
              data-game-fullscreen-go
              onClick={() => {
                close();
                void enterFullscreen(landscape);
              }}
              className="arcade-btn btn-gold min-h-11 text-base"
            >
              전체화면으로
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
