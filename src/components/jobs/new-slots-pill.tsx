"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/** 빈자리 보드 위: 새 공고(등록 · 끌어올리기)가 생기면 「새 빈자리 ○개」 — 오픈채팅처럼 눌렀을 때만 위로 */
export function NewSlotsPill({ region, since }: { region: string | null; since: number }) {
  const router = useRouter();
  const [base, setBase] = useState(since);
  const [count, setCount] = useState(0);
  useEffect(() => {
    let alive = true;
    const check = async () => {
      if (document.hidden) return;
      const q = new URLSearchParams({ since: String(base) });
      if (region) q.set("region", region);
      const r = await fetch(`/api/jobs/latest?${q}`, { cache: "no-store" }).catch(() => null);
      const j = (await r?.json().catch(() => null)) as { count?: number } | null;
      if (alive && typeof j?.count === "number") setCount(j.count);
    };
    const t = window.setInterval(() => void check(), 45_000);
    return () => {
      alive = false;
      window.clearInterval(t);
    };
  }, [base, region]);
  if (!count) return null;
  return (
    <button
      type="button"
      data-new-slots={count}
      onClick={() => {
        setCount(0);
        setBase(Date.now());
        router.refresh();
        window.scrollTo({ top: 0, behavior: "smooth" });
      }}
      className="sticky top-24 z-20 mx-auto inline-flex min-h-10 items-center gap-1.5 rounded-full bg-[#ffcf4a] px-4 text-sm font-black text-[#2a1400] shadow-[0_4px_14px_rgb(0_0_0/0.45)]"
    >
      ⬆ 새 빈자리 {count}개 · 눌러서 보기
    </button>
  );
}
