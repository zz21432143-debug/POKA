"use client";

import { useEffect, useState } from "react";

/** 방금 쓴 글이 오늘 활동 포인트 한도에 걸려 포인트 없이 올라갔을 때 한 번 */
export function CapNotice({ postId }: { postId: string }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    try {
      if (window.sessionStorage.getItem("poka-cap-note") !== postId) return;
      window.sessionStorage.removeItem("poka-cap-note");
    } catch {
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 저장소는 화면이 뜬 뒤에만 읽을 수 있음
    setShow(true);
  }, [postId]);
  if (!show) return null;
  return (
    <p data-cap-notice className="rounded-xl border border-emerald-500/40 bg-emerald-950/40 px-3 py-2 text-sm font-bold text-emerald-200">
      ✅ 글이 올라갔어요. 오늘 활동 포인트(하루 한도)를 다 받아서 이번엔 경험치만 쌓였어요. 출석 · 미션 보너스는 따로 받을 수 있어요.
    </p>
  );
}
