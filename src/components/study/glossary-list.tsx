"use client";

import { useMemo, useState } from "react";
import Link from "@/components/ui/link";
import type { GlossaryTerm } from "@/lib/glossary";

/** 용어 사전: 검색(뜻 · 영어까지) · 초성 색인 · 그룹별 목록 */
export function GlossaryList({ groups }: { groups: { initial: string; terms: GlossaryTerm[] }[] }) {
  const [q, setQ] = useState("");
  const query = q.trim().toLowerCase();
  const shown = useMemo(
    () =>
      query
        ? groups
            .map((g) => ({ ...g, terms: g.terms.filter((t) => `${t.term} ${t.en ?? ""} ${t.def}`.toLowerCase().includes(query)) }))
            .filter((g) => g.terms.length)
        : groups,
    [groups, query],
  );
  const count = shown.reduce((n, g) => n + g.terms.length, 0);
  return (
    <div className="grid gap-3">
      <div className="sticky top-2 z-10 grid gap-2 rounded-2xl border border-white/10 bg-[#141110]/95 p-3 backdrop-blur">
        <input
          data-glossary-search
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="🔍 용어 찾기 (예: 사이드팟, c벳, ICM)"
          aria-label="용어 찾기"
          className="h-12 rounded-xl border border-white/20 bg-black px-3 text-base text-white"
        />
        {!query ? (
          <nav aria-label="초성 색인" className="flex flex-wrap gap-1">
            {groups.map((g) => (
              <a key={g.initial} href={`#g-${g.initial}`} className="grid min-h-9 min-w-9 place-items-center rounded-lg bg-white/5 px-2 text-sm font-black text-[#f3d9a4] hover:bg-white/10">
                {g.initial}
              </a>
            ))}
          </nav>
        ) : (
          <p className="text-xs text-[#b8ab98]">{count}개 찾음</p>
        )}
      </div>
      {shown.length === 0 ? <p className="rounded-xl border border-white/10 p-4 text-sm text-[#d1c7b5]">찾는 용어가 없어요. 룰 Q&A 게시판에 물어보세요.</p> : null}
      {shown.map((g) => (
        <section key={g.initial} id={`g-${g.initial}`} aria-label={g.initial} className="scroll-mt-40 grid gap-2">
          <h2 className="text-lg font-black text-[#c9a25c]">{g.initial}</h2>
          <dl className="grid gap-2">
            {g.terms.map((t) => (
              <div key={t.term} data-term={t.term} className="rounded-xl border border-white/10 bg-black/30 px-4 py-3">
                <dt className="flex flex-wrap items-baseline gap-2">
                  <span className="text-base font-black text-white">{t.term}</span>
                  {t.en ? <span className="text-xs text-[#9CA3AF]">{t.en}</span> : null}
                </dt>
                <dd className="mt-1 text-[15px] leading-7 text-[#E5E7EB]">
                  {t.def}
                  {t.href ? (
                    <>
                      {" "}
                      <Link href={t.href} className="whitespace-nowrap text-sm font-bold text-[#e7c98a] underline underline-offset-4">
                        자세히 →
                      </Link>
                    </>
                  ) : null}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </div>
  );
}
