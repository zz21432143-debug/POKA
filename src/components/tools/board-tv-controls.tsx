"use client";

import { useEffect, useState } from "react";
import { countdownTick, getBoardVolume, setBoardVolume, unlockBoardSound } from "@/lib/board-sound";

/** TV 화면이 떠 있는 동안 뒤 페이지 스크롤(옆 스크롤바)을 막음 */
export function useLockPageScroll(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const html = document.documentElement;
    const body = document.body;
    const prev = [html.style.overflow, body.style.overflow];
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    return () => {
      html.style.overflow = prev[0];
      body.style.overflow = prev[1];
    };
  }, [active]);
}

function useIsFullscreen() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const sync = () => setOn(Boolean(document.fullscreenElement));
    sync();
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);
  return on;
}

const BTN = "rounded-lg bg-white/15 px-3 py-2 text-sm font-black text-white hover:bg-white/25";

/** 전체 화면 켜기 · 끄기 */
export function FullscreenButton() {
  const on = useIsFullscreen();
  async function toggle() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen?.();
    } catch {
      /* 전체 화면을 못 하는 기기 */
    }
  }
  return (
    <button type="button" data-board-fullscreen onClick={() => void toggle()} className={BTN}>
      {on ? "⛶ 전체 화면 끄기" : "⛶ 전체 화면"}
    </button>
  );
}

/** 알림음 크기(0~100%) — 놓을 때 「띡」 한 번으로 크기 확인 */
export function VolumeControl() {
  const [vol, setVol] = useState(() => Math.round(getBoardVolume() * 100));
  return (
    <label data-board-volume className="flex items-center gap-2 rounded-lg bg-white/15 px-3 py-1.5 text-sm font-black text-white">
      <span aria-hidden>{vol === 0 ? "🔇" : vol < 50 ? "🔉" : "🔊"}</span>
      <input
        type="range"
        min={0}
        max={100}
        step={5}
        value={vol}
        aria-label="알림음 크기"
        onChange={(e) => {
          const next = Number(e.target.value);
          setVol(next);
          setBoardVolume(next / 100);
        }}
        onPointerUp={() => {
          unlockBoardSound();
          countdownTick(3);
        }}
        onKeyUp={() => countdownTick(3)}
        className="w-24 accent-amber-400 sm:w-32"
      />
      <span className="w-9 text-right tabular-nums">{vol}%</span>
    </label>
  );
}
