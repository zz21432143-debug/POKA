"use client";

import { useEffect, useState } from "react";
import { cn } from "cn";
import type { ShareFormat } from "@/lib/share-image";

/** 이 기기에 기억하는 이미지 모양 */
const FORMAT_KEY = "poka-share-format";

/**
 * 「이미지로 공유」 버튼 + 모양 고르기(정사각형 = 카톡 · 단톡방 / 세로형 = 인스타 스토리).
 * onShare가 실제로 그려서 공유 · 저장하고 결과를 돌려줌.
 */
export function ShareButton({
  label,
  onShare,
  className,
}: {
  label: string;
  onShare: (format: ShareFormat) => Promise<"shared" | "downloaded" | "failed">;
  className?: string;
}) {
  const [format, setFormat] = useState<ShareFormat>("square");
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- 저장된 값은 화면이 뜬 뒤에만 읽을 수 있습니다.
      if (window.localStorage.getItem(FORMAT_KEY) === "story") setFormat("story");
    } catch {
      /* 저장소를 못 쓰면 정사각형 */
    }
  }, []);
  function pick(next: ShareFormat) {
    setFormat(next);
    try {
      window.localStorage.setItem(FORMAT_KEY, next);
    } catch {
      /* 무시 */
    }
  }
  return (
    <div data-share-box className={cn("flex flex-wrap items-center gap-2", className)}>
      <button
        type="button"
        data-share-result
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setNote(null);
          const done = await onShare(format).catch(() => "failed" as const);
          setBusy(false);
          setNote(done === "shared" ? "공유했어요" : done === "downloaded" ? "이미지를 저장했어요" : "이미지를 만들지 못했어요");
        }}
        className="min-h-11 rounded-xl bg-[#FEE500] px-4 text-sm font-black text-black disabled:opacity-60"
      >
        {busy ? "만드는 중…" : `📤 ${label}`}
      </button>
      <span role="radiogroup" aria-label="이미지 모양" className="flex rounded-lg border border-white/15 bg-black/30 p-0.5 text-xs font-bold">
        {(
          [
            ["square", "□ 정사각(카톡)"],
            ["story", "▯ 세로(스토리)"],
          ] as const
        ).map(([k, l]) => (
          <button
            key={k}
            type="button"
            role="radio"
            aria-checked={format === k}
            data-share-format={k}
            onClick={() => pick(k)}
            className={cn("min-h-9 rounded-md px-2.5", format === k ? "bg-[#c9a25c] text-[#1d1611]" : "text-[#d1c7b5]")}
          >
            {l}
          </button>
        ))}
      </span>
      {note ? <span className="text-xs text-[#d1c7b5]">{note}</span> : null}
    </div>
  );
}
