"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { PotTitleBadge } from "@/components/honor/crowned-frame";
import { MyRankList } from "@/components/user/my-rank-list";
import type { MyRanks } from "@/lib/my-rank";

/** 내정보 창: 내 칭호 + 내 랭킹(창이 보일 때만 불러옴) */
export function MyHonorMini({ nickname }: { nickname: string }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [ranks, setRanks] = useState<MyRanks | null>(null);
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    let done = false;
    const io = new IntersectionObserver((entries) => {
      if (done || !entries.some((e) => e.isIntersecting)) return;
      done = true;
      io.disconnect();
      void fetch("/api/me/rank", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((json: { ranks?: MyRanks } | null) => {
          if (json?.ranks) setRanks(json.ranks);
        })
        .catch(() => undefined);
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={boxRef} data-my-honor-mini className="mt-2.5 grid gap-1.5 rounded-xl bg-[#241c1e] px-3 py-2">
      <div className="flex items-center gap-2">
        <p className="text-sm font-semibold text-white">내 칭호 · 랭킹</p>
        <Link href="/account#my-honor" className="ml-auto text-[11px] font-bold text-[#c9a25c]">
          자세히 ›
        </Link>
      </div>
      <div className="flex min-h-6 flex-wrap items-center gap-1">
        <PotTitleBadge nickname={nickname} max={3} />
        <span className="text-[11px] text-zinc-400 [&:not(:only-child)]:hidden">아직 칭호가 없어요</span>
      </div>
      {ranks ? <MyRankList ranks={ranks} compact /> : <p className="text-[11px] text-zinc-500">랭킹 불러오는 중…</p>}
    </div>
  );
}
