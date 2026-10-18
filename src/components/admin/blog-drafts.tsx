"use client";

import { useState } from "react";
import { cn } from "cn";
import type { BlogDraft } from "@/lib/blog-drafts";

/** 블로그 글감 목록: 오늘 올릴 글 하나를 크게, 나머지는 접어서. 복사 버튼 · 올렸어요 표시 */
export function BlogDrafts({ drafts, initialPosted }: { drafts: BlogDraft[]; initialPosted: Record<string, string> }) {
  const [posted, setPosted] = useState(initialPosted);
  const [copied, setCopied] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date());
  const left = drafts.filter((d) => !posted[d.key]);
  const next = left[0] ?? null;
  const postedToday = Object.values(posted).filter((d) => d === today).length;

  async function copy(id: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // 클립보드를 못 쓰는 브라우저: 임시 칸으로 복사
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setCopied(id);
    window.setTimeout(() => setCopied((c) => (c === id ? null : c)), 1500);
  }

  async function mark(key: string, done: boolean) {
    setError(null);
    const res = await fetch("/api/admin/blog", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key, done }) }).catch(() => null);
    if (!res?.ok) {
      setError("저장하지 못했어요. 다시 눌러 주세요.");
      return;
    }
    setPosted((p) => {
      const n = { ...p };
      if (done) n[key] = today;
      else delete n[key];
      return n;
    });
  }

  const card = (d: BlogDraft, big: boolean) => {
    const done = posted[d.key];
    const btn = (id: string, label: string, text: string) => (
      <button
        type="button"
        data-blog-copy={id}
        onClick={() => void copy(`${d.key}:${id}`, text)}
        className={cn(
          "min-h-11 rounded-lg px-3 text-sm font-bold",
          copied === `${d.key}:${id}` ? "bg-emerald-500 text-black" : "bg-[#c9a25c] text-[#1d1611]",
        )}
      >
        {copied === `${d.key}:${id}` ? "✅ 복사됨" : label}
      </button>
    );
    return (
      <article key={d.key} data-blog-draft={d.key} className={cn("grid gap-2 rounded-2xl border bg-[#151213] p-3 sm:p-4", big ? "border-[#c9a25c]" : "border-border", done && "opacity-60")}>
        <div className="flex flex-wrap items-center gap-2">
          <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-black", d.kind === "holdem" ? "bg-[#1f6f4a] text-white" : "bg-[#7a1c22] text-white")}>{d.kind === "holdem" ? "홀덤 가이드" : "딜러 가이드"}</span>
          <span className="text-xs text-muted-foreground">블로그 카테고리: {d.kind === "holdem" ? "홀덤 공부" : "딜러 실무"}</span>
          {done ? <span className="text-xs font-bold text-emerald-300">✅ {done} 올림</span> : null}
        </div>
        <h3 className="text-base font-bold break-keep">{d.title}</h3>
        <div className="flex flex-wrap gap-1.5">
          {btn("title", "제목 복사", d.title)}
          {btn("body", "본문 복사", d.body)}
          {btn("tags", "태그 복사", d.tags)}
          <button
            type="button"
            data-blog-done={d.key}
            onClick={() => void mark(d.key, !done)}
            className={cn("min-h-11 rounded-lg border px-3 text-sm font-bold", done ? "border-border text-muted-foreground" : "border-emerald-400 text-emerald-300")}
          >
            {done ? "올림 취소" : "올렸어요"}
          </button>
        </div>
        {big ? (
          <pre className="max-h-80 overflow-y-auto rounded-xl bg-black/40 p-3 font-sans text-[13px] leading-6 whitespace-pre-wrap text-[#ece4d6]">{d.body}</pre>
        ) : null}
        <p className="text-xs text-muted-foreground">{d.tags}</p>
        {d.photo && big ? (
          <p className="text-xs text-muted-foreground">
            사진: <a href={d.photo} target="_blank" rel="noreferrer" className="underline">{d.photo.replace("https://", "")}</a> 화면을 캡처해서 넣으면 좋아요
          </p>
        ) : null}
      </article>
    );
  };

  return (
    <div className="grid gap-3">
      <p className="text-sm">
        전체 {drafts.length}편 · 올림 {drafts.length - left.length}편 · 남은 {left.length}편
        {postedToday ? <b className="ml-2 text-emerald-300">오늘 {postedToday}편 올렸어요 👍</b> : null}
      </p>
      {postedToday >= 2 ? <p className="rounded-xl bg-amber-500/15 p-3 text-sm text-amber-200">오늘은 충분해요. 하루 1~2편이 네이버에 가장 안전해요.</p> : null}
      {error ? <p className="text-sm font-bold text-rose-300">{error}</p> : null}
      {next ? (
        <section aria-label="오늘 올릴 글" className="grid gap-2">
          <h2 className="text-lg font-semibold">오늘 올릴 글</h2>
          {card(next, true)}
        </section>
      ) : (
        <p className="text-sm text-emerald-300">모든 글감을 올렸어요! 새 가이드가 생기면 여기에 자동으로 추가돼요.</p>
      )}
      <button type="button" onClick={() => setShowAll((v) => !v)} className="min-h-11 w-fit rounded-lg border border-border px-4 text-sm font-bold">
        {showAll ? "전체 목록 접기" : `전체 목록 보기(${drafts.length}편)`}
      </button>
      {showAll ? <div className="grid gap-2">{drafts.filter((d) => d.key !== next?.key).map((d) => card(d, false))}</div> : null}
    </div>
  );
}
