"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

/** 공지 제목 앞 [업데이트] · [이벤트] · [점검] · [안내] 같은 말머리 → 색 태그 */
const TAG_TONE: Record<string, string> = {
  업데이트: "bg-sky-500 text-white",
  이벤트: "bg-pink-500 text-white",
  점검: "bg-amber-500 text-[#1d1611]",
  안내: "bg-zinc-500 text-white",
  공지: "bg-[#c9a25c] text-[#1d1611]",
};
export function splitNoticeTag(title: string): { tag: string | null; rest: string } {
  const m = title.match(/^\s*\[([^\]]{1,6})\]\s*(.*)$/);
  return m ? { tag: m[1], rest: m[2] } : { tag: null, rest: title };
}
export function NoticeTag({ tag }: { tag: string }) {
  return <span className={`shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-black ${TAG_TONE[tag] ?? "bg-[#c9a25c] text-[#1d1611]"}`}>{tag}</span>;
}

export type RollingNoticeItem = { text: string; href?: string };

/** 맨 위 공지 띠: 관리자 문구 + 최근 공지(말머리 태그)를 5초마다 돌려 보여 줌 */
export function SiteNoticeBanner({ text, items = [] }: { text: string | null | undefined; items?: RollingNoticeItem[] }) {
  const list: RollingNoticeItem[] = [...(text?.trim() ? [{ text: text.trim() }] : []), ...items];
  const [i, setI] = useState(0);
  useEffect(() => {
    if (list.length < 2) return;
    const t = window.setInterval(() => setI((v) => (v + 1) % list.length), 5000);
    return () => window.clearInterval(t);
  }, [list.length]);
  if (!list.length) return null;
  const cur = list[i % list.length];
  const { tag, rest } = splitNoticeTag(cur.text);
  const body = (
    <>
      {tag ? <NoticeTag tag={tag} /> : <span aria-hidden>📢</span>}
      <span className="min-w-0 truncate">{rest}</span>
      {list.length > 1 ? (
        <span className="ml-1 shrink-0 text-[11px] text-amber-300/70">
          {(i % list.length) + 1}/{list.length}
        </span>
      ) : null}
    </>
  );
  return (
    <div data-rolling-notice className="border-b border-amber-500/30 bg-amber-950/40">
      <div key={i} className="notice-roll mx-auto flex max-w-[1560px] items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-amber-200 sm:px-5">
        {cur.href ? (
          <Link href={cur.href} className="flex min-h-9 min-w-0 items-center gap-2 hover:underline">
            {body}
          </Link>
        ) : (
          body
        )}
      </div>
    </div>
  );
}
