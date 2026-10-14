"use client";

import { useEffect, useRef, useState } from "react";

/** TV(1920×1080) 화면을 작게 줄여 미리 보기. 공유 탭에서 TV 링크를 열기 전에 확인 */
export function TvPreview({ src }: { src: string }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setScale(el.clientWidth / 1920));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={boxRef} data-tv-preview className="relative aspect-video w-full overflow-hidden rounded-xl border border-white/20 bg-black">
      {scale > 0 ? (
        <iframe
          title="TV 화면 미리보기"
          src={src}
          className="pointer-events-none absolute top-0 left-0 origin-top-left border-0"
          style={{ width: 1920, height: 1080, transform: `scale(${scale})` }}
        />
      ) : null}
    </div>
  );
}
