"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "cn";

/** 내 공고 한 장: 지금 빈자리 수 · 카톡 일정 붙여넣기 → 갱신하고 맨 위로 */
export function MyJobRefresh({
  id,
  title,
  content,
  status,
  openSlotCount,
  bumpedAt,
}: {
  id: string;
  title: string;
  content: string;
  status: string;
  openSlotCount: number;
  bumpedAt: string;
}) {
  const router = useRouter();
  const [text, setText] = useState(content);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const changed = text.trim() !== content.trim();
  async function save() {
    setBusy(true);
    setNote(null);
    const r = await fetch(`/api/posts/${id}/refresh`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: text }) }).catch(() => null);
    const j = (await r?.json().catch(() => null)) as { error?: string; bumped?: boolean } | null;
    setBusy(false);
    if (!r?.ok) {
      setNote(j?.error ?? "갱신하지 못했어요.");
      return;
    }
    setNote(j?.bumped ? "✅ 갱신하고 맨 위로 올렸어요." : "✅ 내용을 바꿨어요(끌어올리기는 하루 한 번이라 내일 다시 올릴 수 있어요).");
    router.refresh();
  }
  return (
    <article data-my-job={id} className="grid gap-2 rounded-2xl border border-[#c9a25c]/35 bg-[#17120f] p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className={cn("rounded-full px-2 text-xs font-black", status === "open" ? "bg-emerald-700 text-white" : "bg-[#3a332c] text-[#c9c0b2]")}>
          {status === "open" ? "모집중" : "마감"}
        </span>
        <Link href={`/posts/${id}`} className="min-w-0 flex-1 truncate text-base font-black text-white hover:underline">
          {title}
        </Link>
      </div>
      <p className="text-xs text-[#c9c0b2]">
        지금 열린 빈자리 <b className="text-[#ffcf4a]">{openSlotCount}곳</b> · 마지막으로 올린 때 {new Date(bumpedAt).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}
      </p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={6}
        aria-label={`${title} 일정 붙여넣기`}
        className="min-h-32 w-full rounded-xl border border-white/15 bg-black/40 p-2.5 text-sm leading-relaxed text-white"
        placeholder="카톡으로 받은 새 일정을 그대로 붙여넣으세요"
      />
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" data-my-job-save disabled={busy || text.trim().length < 5} onClick={() => void save()} className="arcade-btn btn-main min-h-11 px-4 text-sm">
          {busy ? "갱신 중…" : changed ? "갱신하고 맨 위로" : "그대로 맨 위로 올리기"}
        </button>
        <span className="text-xs text-zinc-400">다 찬 줄은 끝에 「마감」만 적어도 빠져요</span>
      </div>
      {note ? <p className="text-sm font-bold text-[#ffe08a]">{note}</p> : null}
    </article>
  );
}
