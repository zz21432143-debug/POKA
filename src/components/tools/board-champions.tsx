"use client";

import { useEffect, useState } from "react";

type Champ = { id: string; name: string; event: string; day: string; entries: number };

/** 이달의 챔피언 목록(현황판 진행 탭) · 카톡용 글 복사 */
export function BoardChampions({ refresh }: { refresh: number }) {
  const [list, setList] = useState<Champ[]>([]);
  const [month, setMonth] = useState("");
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    let alive = true;
    void fetch("/api/tools/game-board/champions", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { month: string; list: Champ[] } | null) => {
        if (!alive || !d) return;
        setList(d.list);
        setMonth(d.month);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [refresh]);
  if (!list.length) return null;
  const [y, m] = month.split("-").map(Number);
  const text = [`🏆 ${m}월의 챔피언`, ...list.map((c) => `${c.day.slice(5).replace("-", "/")} ${c.event} — ${c.name}${c.entries ? ` (엔트리 ${c.entries})` : ""}`), "", "POKA 게임 현황판 · pokerwiki.co.kr"].join("\n");
  return (
    <div data-board-champions className="grid gap-1.5 rounded-xl border border-white/10 bg-black/40 p-3">
      <div className="flex items-center gap-2">
        <b className="text-sm text-white">
          🏆 {y}년 {m}월의 챔피언 <span className="text-xs text-zinc-400">{list.length}명</span>
        </b>
        <button
          type="button"
          onClick={async () => {
            await navigator.clipboard.writeText(text).catch(() => undefined);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1500);
          }}
          className="ml-auto min-h-9 rounded-lg bg-[#FEE500] px-3 text-xs font-black text-black"
        >
          {copied ? "복사됨 ✓" : "카톡용 글 복사"}
        </button>
      </div>
      <ul className="grid gap-0.5 text-sm text-zinc-200">
        {list.map((c) => (
          <li key={c.id} className="flex items-center gap-2">
            <span className="w-12 shrink-0 text-xs text-zinc-500 tabular-nums">{c.day.slice(5).replace("-", "/")}</span>
            <span className="min-w-0 flex-1 truncate">{c.event}</span>
            <b className="shrink-0 text-amber-200">{c.name}</b>
            <button
              type="button"
              aria-label={`${c.name} 기록 지우기`}
              onClick={async () => {
                if (!window.confirm(`${c.name} 기록을 지울까요?`)) return;
                await fetch(`/api/tools/game-board/champions?id=${encodeURIComponent(c.id)}`, { method: "DELETE" }).catch(() => undefined);
                setList((l) => l.filter((x) => x.id !== c.id));
              }}
              className="min-h-8 shrink-0 rounded px-1.5 text-xs text-zinc-500 hover:text-rose-300"
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
