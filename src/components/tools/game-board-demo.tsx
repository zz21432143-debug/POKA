"use client";

import { useEffect, useRef, useState } from "react";
import { GameBoardScreen } from "@/components/tools/game-board-screen";
import { defaultBoard, makeStructure, type GameBoardData } from "@/lib/game-board";

/** 로그인 전 예시 현황판: 실제처럼 시계가 흐르는 견본(저장·조작 없음) */
function demoBoard(startedAt: number): GameBoardData {
  return {
    ...defaultBoard(),
    name: "POKA SUNDAY MAIN",
    subtitle: "DAY 1 · 예시 화면",
    levels: makeStructure({ startBb: 200, minutes: 20, count: 16, breakEvery: 4 }),
    startStack: 30_000,
    entries: 48,
    remaining: 31,
    rebuys: 12,
    rebuyStack: 30_000,
    earlies: 30,
    earlyStack: 5_000,
    addonOn: true,
    addons: 20,
    addonStack: 20_000,
    regLevel: 8,
    prizeTitle: "",
    prizes: [
      { place: "1ST", amount: "트로피 + 시드권", color: "gold" },
      { place: "2ND", amount: "시드권", color: "silver" },
      { place: "3RD", amount: "시드권", color: "bronze" },
      { place: "4TH", amount: "기념품", color: "white" },
      { place: "5TH", amount: "기념품", color: "white" },
    ],
    notice: "",
    // 레벨 6(휴식 포함 순서상 7번째), 6분 지난 상태에서 흐르기 시작
    clock: { level: 6, elapsedMs: 6 * 60_000, runningSince: startedAt },
  };
}

export function GameBoardDemo() {
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);
  const [startedAt] = useState(() => Date.now());
  const [now, setNow] = useState(startedAt);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setScale(el.clientWidth / 1280));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <figure className="grid gap-1.5">
      <div ref={box} data-board-demo className="relative aspect-video w-full overflow-hidden rounded-2xl border-2 border-[#c9a25c]/50 bg-black">
        <div style={{ width: 1280, height: 720, transform: `scale(${scale})`, transformOrigin: "top left" }} className={scale ? "absolute top-0 left-0" : "invisible absolute top-0 left-0"}>
          <GameBoardScreen data={demoBoard(startedAt)} now={now} />
        </div>
      </div>
      <figcaption className="text-center text-xs text-[#9CA3AF]">예시 화면 · 매장 TV에 이렇게 띄워져요</figcaption>
    </figure>
  );
}
