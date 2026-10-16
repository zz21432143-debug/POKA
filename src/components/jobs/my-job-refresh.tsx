"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "cn";
import { slotsFromText } from "@/lib/job-slots";

/** 내 공고 한 장: 지금 빈자리 수 · 카톡 일정 붙여넣기 → 갱신하고 맨 위로 */
export function MyJobRefresh({
  id,
  title,
  content,
  status,
  openSlotCount,
  bumpedAt,
  company = null,
  logoUrl = null,
}: {
  id: string;
  title: string;
  content: string;
  status: string;
  openSlotCount: number;
  bumpedAt: string;
  company?: string | null;
  logoUrl?: string | null;
}) {
  const router = useRouter();
  const [text, setText] = useState(content);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const changed = text.trim() !== content.trim();
  const [logo, setLogo] = useState(logoUrl);
  async function pickLogo(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setNote("사진 파일을 골라 주세요.");
      return;
    }
    setBusy(true);
    const form = new FormData();
    form.append("file", file);
    const up = await fetch("/api/uploads/image", { method: "POST", body: form }).catch(() => null);
    const uj = (await up?.json().catch(() => null)) as { url?: string; error?: string } | null;
    if (!up?.ok || !uj?.url) {
      setBusy(false);
      setNote(uj?.error ?? "사진을 올리지 못했어요.");
      return;
    }
    const r = await fetch("/api/jobs/store-logo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ postId: id, url: uj.url }) }).catch(() => null);
    const j = (await r?.json().catch(() => null)) as { error?: string } | null;
    setBusy(false);
    if (!r?.ok) {
      setNote(j?.error ?? "로고를 저장하지 못했어요.");
      return;
    }
    setLogo(uj.url);
    setNote("✅ 매장 로고를 붙였어요. 오픈채팅 말풍선 옆에 이 로고가 보여요.");
  }
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date());
  const slots = slotsFromText(text, today).filter((s) => s.date >= today);
  // 줄 끝에 「마감」을 붙이거나 떼기
  const toggleClosed = (line: number) => {
    const rows = text.split(/\r?\n/);
    const cur = rows[line] ?? "";
    rows[line] = /\s*마감\s*$/.test(cur) ? cur.replace(/\s*마감\s*$/, "") : `${cur.trimEnd()} 마감`;
    setText(rows.join("\n"));
  };
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
      {company ? (
        <label data-store-logo className="flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-white/10 bg-black/30 px-2.5 text-xs font-bold text-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {logo ? <img src={logo} alt="" width={32} height={32} className="size-8 rounded-xl bg-white object-cover" /> : <span className="grid size-8 place-items-center rounded-xl bg-white/10">🏪</span>}
          {logo ? `${company} 로고 바꾸기` : `${company} 로고 올리기(오픈채팅 말풍선 옆에 보여요)`}
          <input type="file" accept="image/*" className="sr-only" onChange={(e) => void pickLogo(e.target.files?.[0])} />
        </label>
      ) : null}
      <p className="text-xs text-[#c9c0b2]">
        지금 열린 빈자리 <b className="text-[#ffcf4a]">{openSlotCount}곳</b> · 마지막으로 올린 때 {new Date(bumpedAt).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}
      </p>
      {slots.length ? (
        <ul data-my-job-slots className="grid gap-1">
          {slots.map((s) => (
            <li key={`${s.line}-${s.date}`} className="flex items-center gap-2 rounded-lg bg-black/30 px-2.5 py-1.5 text-sm">
              <span className={cn("min-w-0 flex-1 truncate", s.closed ? "text-zinc-500 line-through" : "text-white")}>
                {Number(s.date.slice(5, 7))}/{Number(s.date.slice(8))} {s.time ?? ""} {s.count ?? ""} {s.branch ? `· ${s.branch}` : ""}
              </span>
              <button
                type="button"
                data-slot-close={s.line}
                onClick={() => typeof s.line === "number" && toggleClosed(s.line)}
                className={cn("shrink-0 rounded-full px-2.5 py-1 text-xs font-black", s.closed ? "bg-white/15 text-white" : "bg-[#7a1c22] text-white")}
              >
                {s.closed ? "다시 열기" : "마감"}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
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
