"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import type { SharedBoard } from "@/lib/game-board-server";
import { GameBoardScreen, useServerNow } from "@/components/tools/game-board-screen";

const POLL_MS = 3000;
const noop = () => () => {};

/** 보기 전용 현황판(TV 링크): 화면 가득, 주인이 바꾸면 3초 안에 반영 */
export function GameBoardViewer({ token, initial }: { token: string; initial: SharedBoard }) {
  const [board, setBoard] = useState(initial);
  const [offset, setOffset] = useState(0);
  const [gone, setGone] = useState(false);
  const [sound, setSound] = useState(false);
  const inBrowser = useSyncExternalStore(noop, () => true, () => false);
  const now = useServerNow(initial.serverNow, offset);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 내 시계와 서버 시각 차이는 브라우저에서만 잴 수 있음
    setOffset(initial.serverNow - Date.now());
  }, [initial.serverNow]);

  const version = board.version;
  useEffect(() => {
    let stop = false;
    const poll = async () => {
      if (document.hidden) return;
      const res = await fetch(`/api/g/${encodeURIComponent(token)}?v=${version}`, { cache: "no-store" }).catch(() => null);
      if (stop || !res) return;
      if (res.status === 404) return setGone(true);
      const json = (await res.json().catch(() => null)) as { changed: boolean; board?: SharedBoard; serverNow?: number } | null;
      if (!json) return;
      if (json.changed && json.board) {
        setBoard(json.board);
        setOffset(json.board.serverNow - Date.now());
      } else if (json.serverNow) setOffset(json.serverNow - Date.now());
    };
    const timer = window.setInterval(poll, POLL_MS);
    document.addEventListener("visibilitychange", poll);
    return () => {
      stop = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", poll);
    };
  }, [token, version]);

  /** 한 번 눌러야 브라우저가 소리 · 전체 화면을 허락합니다 */
  async function start() {
    setSound(true);
    try {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen?.();
    } catch {
      /* 무시 */
    }
  }

  if (!inBrowser) return null;
  return createPortal(
    <div data-board-shared className="fixed inset-0 z-[9999] bg-black">
      {gone ? (
        <div className="grid h-full place-items-center p-6 text-center">
          <div className="grid gap-2">
            <p className="text-2xl font-black text-white">현황판을 볼 수 없습니다</p>
            <p className="text-zinc-300">보기 링크가 꺼졌습니다. 담당자에게 새 링크를 받아 주세요.</p>
          </div>
        </div>
      ) : (
        <>
          <GameBoardScreen data={board.data} now={now} sound={sound} />
          {!sound ? (
            <button type="button" onClick={() => void start()} className="absolute right-3 bottom-3 rounded-xl bg-amber-400 px-4 py-2 text-sm font-black text-black shadow-lg">
              🔊 전체 화면 + 레벨 알림음 켜기
            </button>
          ) : null}
        </>
      )}
    </div>,
    document.body,
  );
}
