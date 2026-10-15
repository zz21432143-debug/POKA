"use client";

import { useEffect, useState } from "react";
import { bgmOn, setBgmOn, startBgm, stopBgm } from "@/lib/game-bgm";

/**
 * 게임방 BGM: 처음 화면을 누르면 시작(브라우저가 소리 자동 재생을 막아서) · 다른 탭으로 가면 멈춤 · 게임방을 나가면 끝.
 * 오른쪽 아래 🎵 버튼으로 켜고 끄기(기억함).
 */
export function GameAudio() {
  const [on, setOn] = useState(true);
  useEffect(() => {
    const saved = bgmOn();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 저장된 설정은 화면이 뜬 뒤에만 읽을 수 있음
    setOn(saved);
    const kick = () => {
      if (bgmOn() && !document.hidden) startBgm();
    };
    const vis = () => (document.hidden ? stopBgm() : bgmOn() && startBgm());
    window.addEventListener("pointerdown", kick, { once: true });
    document.addEventListener("visibilitychange", vis);
    return () => {
      window.removeEventListener("pointerdown", kick);
      document.removeEventListener("visibilitychange", vis);
      stopBgm();
    };
  }, []);
  return (
    <button
      type="button"
      data-game-bgm={on ? "on" : "off"}
      aria-pressed={on}
      aria-label={on ? "배경음악 끄기" : "배경음악 켜기"}
      onClick={() => {
        const next = !on;
        setOn(next);
        setBgmOn(next);
        if (next) startBgm();
        else stopBgm();
      }}
      className="absolute top-0 right-0 z-30 flex min-h-10 items-center gap-1 rounded-full border-2 border-[#ffcf4a] bg-[#1a1230] px-3 text-sm font-black text-[#ffcf4a]"
    >
      {on ? "🎵 BGM 켬" : "🔇 BGM 끔"}
    </button>
  );
}
