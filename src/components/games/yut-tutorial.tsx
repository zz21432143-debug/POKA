"use client";

import { useState } from "react";
import { createPortal } from "react-dom";

const STEPS = [
  {
    icon: "🎲",
    title: "① 윷 던지기",
    body: "내 차례가 오면 판 가운데 반짝이는 멍석이나 「윷 던지기」 버튼을 누르세요. PC는 스페이스바로도 던져요. 게이지를 눌러 세기를 정할 수 있어요.",
  },
  {
    icon: "👆",
    title: "② 움직일 말 고르기",
    body: "머리 위에 「TAP ▼」이 뜬 내 말을 누르세요. 아직 판에 없는 말은 출발 모서리 옆 「🐾 새 말 내보내기」를 누르면 돼요.",
  },
  {
    icon: "🟨",
    title: "③ 갈 곳 누르기",
    body: "노란 점선 칸이 갈 수 있는 곳이에요. 그 칸을 누르면 말이 달려가요. 같은 칸의 우리 말은 업혀서 함께 가고, 상대 말이 있으면 잡아요!",
  },
] as const;

export const YUT_TUTORIAL_KEY = "poka-yut-tutorial-v1";

/** 윷놀이 하는 법 3장(처음 한 번 자동 · 「❔ 하는 법」으로 다시 보기) */
export function YutTutorial({ onClose }: { onClose: () => void }) {
  const [i, setI] = useState(0);
  const step = STEPS[i];
  const last = i === STEPS.length - 1;
  const close = () => {
    try {
      window.localStorage.setItem(YUT_TUTORIAL_KEY, "1");
    } catch {
      /* 저장 못 해도 닫기는 됨 */
    }
    onClose();
  };
  if (typeof document === "undefined") return null;
  return createPortal(
    <div data-yut-tutorial className="fixed inset-0 z-[90] grid place-items-center bg-[#0a0614]/60 px-4" role="dialog" aria-modal="true" aria-label="윷놀이 하는 법">
      <div className="yut-cutin-card grid w-full max-w-sm gap-3 rounded-2xl border-4 border-[#0a0614] bg-[#1a0f2e] p-5 text-center shadow-[6px_6px_0_#0a0614]">
        <p className="font-sans font-black text-[10px] tracking-widest text-[#6ad7ff]">HOW TO PLAY · {i + 1}/{STEPS.length}</p>
        <span className="text-5xl" aria-hidden>
          {step.icon}
        </span>
        <h2 className="text-xl font-black text-[#ffe08a]">{step.title}</h2>
        <p className="text-[15px] leading-7 text-[#ece4d6]">{step.body}</p>
        <div className="flex justify-center gap-1.5" aria-hidden>
          {STEPS.map((_, k) => (
            <span key={k} className={k === i ? "h-2 w-5 rounded-full bg-[#ffcf4a]" : "size-2 rounded-full bg-white/30"} />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" data-yut-tutorial-skip onClick={close} className="arcade-btn btn-dark min-h-11 text-sm">
            건너뛰기
          </button>
          <button
            type="button"
            data-yut-tutorial-next
            onClick={() => (last ? close() : setI(i + 1))}
            className="arcade-btn btn-gold min-h-11 text-base"
          >
            {last ? "시작하기!" : "다음 →"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
