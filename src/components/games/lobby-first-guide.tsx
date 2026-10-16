"use client";

import { useEffect, useState } from "react";

/** 게임 로비 첫 방문: 「빠른 대전 → 요괴 고르기 → 한 판」 3단계(한 번 닫으면 안 보임) */
export function LobbyFirstGuide({ game }: { game: "omok" | "yut" }) {
  const key = `poka-lobby-guide-${game}`;
  const [open, setOpen] = useState(false);
  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- 저장소는 화면이 뜬 뒤에만 읽을 수 있음
      if (!window.localStorage.getItem(key)) setOpen(true);
    } catch {
      /* 못 읽으면 안 보여 줌 */
    }
  }, [key]);
  if (!open) return null;
  const close = () => {
    setOpen(false);
    try {
      window.localStorage.setItem(key, "1");
    } catch {
      /* 저장 못 해도 닫음 */
    }
  };
  const name = game === "omok" ? "요괴 오목" : "요괴 윷놀이";
  return (
    <section data-lobby-guide aria-label="처음 왔다면" className="arcade-panel grid gap-2 p-3">
      <div className="flex items-center gap-2">
        <h2 className="text-base font-black text-[#ffe08a]">👋 {name} 처음이면 이렇게!</h2>
        <button type="button" onClick={close} className="ml-auto rounded-lg bg-white/10 px-2.5 py-1 text-xs font-bold text-white">
          알겠어요
        </button>
      </div>
      <ol className="grid gap-1.5 text-sm text-white sm:grid-cols-3">
        <li className="rounded-xl bg-black/35 px-3 py-2">
          <b className="text-[#ffcf4a]">1.</b> 아래 <b>⚡ 빠른 대전</b>을 눌러요
        </li>
        <li className="rounded-xl bg-black/35 px-3 py-2">
          <b className="text-[#ffcf4a]">2.</b> 처음이면 <b>내 요괴</b>를 하나 골라요(무료)
        </li>
        <li className="rounded-xl bg-black/35 px-3 py-2">
          <b className="text-[#ffcf4a]">3.</b> 상대가 오면 <b>READY</b> → 한 판!
        </li>
      </ol>
    </section>
  );
}
