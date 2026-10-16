"use client";

import { useEffect, useRef, useState } from "react";
import Link from "@/components/ui/link";
import type { MyRanks } from "@/lib/my-rank";
import { RankChange } from "@/components/user/rank-change";

/** 홈 랭킹 아래: 로그인한 회원의 내 순위 한 줄(보일 때만 불러옴 · 비로그인이면 안 보임) */
export function MyHomeRank() {
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

  // 홈 랭킹 세 칸과 같은 항목만(레벨 · 마크 · 팟 계산)
  const rows = ranks && !ranks.excluded ? ranks.rows.filter((r) => ["level", "pot", "quiz"].includes(r.key)) : [];
  return (
    <div ref={boxRef} data-my-home-rank className="min-h-1">
      {ranks?.excluded ? (
        <p className="px-1 text-xs text-zinc-500">운영자 · 랭킹 제외 계정은 랭킹에 들어가지 않아요.</p>
      ) : rows.length ? (
        <Link href="/account#my-honor" className="flex min-h-10 flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-[#c9a25c]/40 bg-[#c9a25c]/10 px-3 py-1.5 text-sm">
          <b className="text-[#e7c98a]">내 순위</b>
          {rows.map((r) => (
            <span key={r.key} className="text-zinc-300">
              {r.short} <b className={r.rank != null && r.rank <= 3 ? "text-[#f5d76e]" : "text-white"}>{r.rank == null ? "기록 없음" : `${r.rank}위`}</b>{" "}
              <RankChange change={r.change} before={r.before} now={r.rank} />
            </span>
          ))}
          <span className="ml-auto text-xs font-bold text-[#c9a25c]">내 칭호 · 랭킹 ›</span>
        </Link>
      ) : null}
    </div>
  );
}
