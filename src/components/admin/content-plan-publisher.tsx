"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2Icon, Loader2Icon, SendIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PostPhotoPicker } from "@/components/posts/post-photo-picker";
import type { HandReviewData } from "@/lib/hand-review";
import { cn } from "cn";

export type PublishItem = {
  id: string;
  order: number;
  day: string;
  time: string;
  kind: string;
  boardType: string;
  boardLabel: string;
  title: string;
  content: string;
  hand: HandReviewData | null;
  photos: boolean;
  manualHand: boolean;
  note: string | null;
  publishedId: string | null;
};

type State = { title: string; content: string; photos: string[]; busy: boolean; error: string | null; doneId: string | null };

const KIND_TONE: Record<string, string> = {
  초보: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/40",
  핸드분석: "bg-sky-500/15 text-sky-300 ring-sky-500/40",
  정보: "bg-amber-500/15 text-amber-300 ring-amber-500/40",
};

const PLACEHOLDER = "〔";

/** 계획된 글을 POKA 계정으로 올립니다. 일반 글쓰기와 같은 /api/posts를 써서 금지어·보상·전광판이 똑같이 적용됩니다. */
export function ContentPlanPublisher({ items }: { items: PublishItem[] }) {
  const [state, setState] = useState<Record<string, State>>(() =>
    Object.fromEntries(
      items.map((item) => [
        item.id,
        { title: item.title, content: item.content, photos: [], busy: false, error: null, doneId: item.publishedId },
      ]),
    ),
  );
  const [runningAll, setRunningAll] = useState(false);

  const patch = (id: string, next: Partial<State>) => setState((prev) => ({ ...prev, [id]: { ...prev[id], ...next } }));

  function problem(item: PublishItem, s: State): string | null {
    if (item.manualHand) return "실제 대회 핸드를 핸드리뷰 글쓰기에서 직접 그려 올려 주세요.";
    if (!s.content.trim()) return item.note ?? "본문이 비어 있습니다.";
    if (`${s.title}${s.content}`.includes(PLACEHOLDER)) return "〔 〕 부분을 실제 내용으로 바꿔 주세요.";
    if (item.photos && s.photos.length === 0) return "현장 사진을 1장 이상 올려 주세요.";
    return null;
  }

  async function publish(item: PublishItem): Promise<boolean> {
    const s = state[item.id];
    const blocked = problem(item, s);
    if (blocked) {
      patch(item.id, { error: blocked });
      return false;
    }
    patch(item.id, { busy: true, error: null });
    try {
      const response = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          boardType: item.boardType,
          title: s.title,
          content: s.content,
          ...(item.hand ? { handReview: item.hand } : {}),
          ...(s.photos.length ? { imageUrls: s.photos } : {}),
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as { id?: string; error?: string };
      if (!response.ok || !payload.id) throw new Error(payload.error ?? "올리지 못했습니다.");
      patch(item.id, { busy: false, doneId: payload.id });
      return true;
    } catch (err) {
      patch(item.id, { busy: false, error: err instanceof Error ? err.message : "올리지 못했습니다." });
      return false;
    }
  }

  const ready = items.filter((item) => !state[item.id].doneId && !problem(item, state[item.id]));
  const doneCount = items.filter((item) => state[item.id].doneId).length;

  async function publishAll() {
    setRunningAll(true);
    for (const item of ready) {
      await publish(item);
    }
    setRunningAll(false);
  }

  return (
    <div className="grid gap-3">
      <div className="sticky top-[7.5rem] z-10 flex flex-wrap items-center gap-3 rounded-xl border border-[#c9a25c]/50 bg-[#1d1611]/95 p-3 backdrop-blur">
        <p className="text-sm font-semibold">
          올림 <b className="text-emerald-300">{doneCount}</b> / {items.length} · 바로 올릴 수 있는 글 <b className="text-[#e7c98a]">{ready.length}</b>개
        </p>
        <button
          type="button"
          disabled={runningAll || ready.length === 0}
          onClick={() => void publishAll()}
          className="touch-target ml-auto inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-[#8b2222] px-4 text-sm font-bold text-white hover:bg-[#a12a2a] disabled:opacity-50"
        >
          {runningAll ? <Loader2Icon className="size-4 animate-spin" /> : <SendIcon className="size-4" />}
          준비된 글 {ready.length}개 모두 올리기
        </button>
      </div>

      <ol className="grid gap-3">
        {items.map((item) => {
          const s = state[item.id];
          const blocked = problem(item, s);
          return (
            <li
              key={item.id}
              className={cn(
                "rounded-2xl border p-3 sm:p-4",
                s.doneId ? "border-emerald-700/60 bg-emerald-950/20" : "border-border bg-card",
              )}
            >
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="grid size-7 place-items-center rounded-full bg-[#c9a25c] text-xs font-black text-[#1d1611]">{item.order}</span>
                <b>
                  {item.day} {item.time}
                </b>
                <span className={cn("rounded-md px-2 py-0.5 text-xs font-bold ring-1", KIND_TONE[item.kind])}>{item.kind}</span>
                <span className="text-muted-foreground">{item.boardLabel}</span>
                {item.hand ? <span className="text-xs text-sky-300">핸드·투표 포함</span> : null}
                {s.doneId ? (
                  <Link href={`/posts/${s.doneId}`} className="ml-auto inline-flex min-h-10 items-center gap-1 font-bold text-emerald-300 underline">
                    <CheckCircle2Icon className="size-4" />
                    올림 · 글 보기
                  </Link>
                ) : null}
              </div>

              {s.doneId ? (
                <p className="mt-2 font-semibold">{s.title}</p>
              ) : (
                <div className="mt-3 grid gap-2">
                  <Input value={s.title} onChange={(event) => patch(item.id, { title: event.target.value })} className="h-11 font-semibold" />
                  <Textarea
                    value={s.content}
                    onChange={(event) => patch(item.id, { content: event.target.value })}
                    className="min-h-40 text-sm leading-relaxed"
                    placeholder={item.note ?? ""}
                  />
                  {item.note ? <p className="text-xs text-[#e7c98a]">{item.note}</p> : null}
                  {item.photos ? <PostPhotoPicker value={s.photos} onChange={(photos) => patch(item.id, { photos })} /> : null}
                  {s.error ? <p className="text-sm font-semibold text-destructive">{s.error}</p> : null}
                  <div className="flex flex-wrap items-center gap-2">
                    {item.manualHand ? (
                      <Link
                        href="/boards/hand-review/write"
                        className="touch-target inline-flex min-h-11 items-center rounded-xl border border-[#c9a25c]/60 px-4 text-sm font-bold text-[#e7c98a] hover:bg-[#c9a25c]/10"
                      >
                        핸드리뷰 직접 쓰러 가기
                      </Link>
                    ) : (
                      <button
                        type="button"
                        disabled={s.busy || runningAll}
                        onClick={() => void publish(item)}
                        className="touch-target inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-[#c9a25c] px-4 text-sm font-bold text-[#1d1611] hover:bg-[#e7c98a] disabled:opacity-50"
                      >
                        {s.busy ? <Loader2Icon className="size-4 animate-spin" /> : <SendIcon className="size-4" />}
                        이 글 올리기
                      </button>
                    )}
                    {blocked && !s.error ? <span className="text-xs text-muted-foreground">{blocked}</span> : null}
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
