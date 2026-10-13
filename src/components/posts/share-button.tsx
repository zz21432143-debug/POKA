"use client";

import { useState } from "react";
import { Share2Icon } from "lucide-react";

/**
 * 공유: 휴대폰은 공유 창(카카오톡 등), 안 되면 주소 복사.
 * 주소 끝에 ?from=share 를 붙여 통계에서 공유로 들어온 방문을 구분합니다.
 */
export function ShareButton({ path, title, className }: { path: string; title: string; className?: string }) {
  const [note, setNote] = useState<string | null>(null);
  async function share() {
    const url = `${window.location.origin}${path}${path.includes("?") ? "&" : "?"}from=share`;
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setNote("주소를 복사했어요. 카톡에 붙여넣으세요.");
    } catch (error) {
      if ((error as Error).name === "AbortError") return;
      setNote("공유하지 못했어요. 주소창의 주소를 복사해 주세요.");
    }
    window.setTimeout(() => setNote(null), 2500);
  }
  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        data-share
        onClick={() => void share()}
        className={
          className ??
          "touch-target inline-flex min-h-10 items-center gap-1.5 rounded-full border border-[#c9a25c]/50 px-3.5 text-sm font-bold text-[#f3d9a4] hover:border-[#c9a25c] hover:bg-[#c9a25c]/10"
        }
      >
        <Share2Icon className="size-4" />
        공유
      </button>
      {note ? <span className="text-xs text-[#e7c98a]">{note}</span> : null}
    </span>
  );
}
