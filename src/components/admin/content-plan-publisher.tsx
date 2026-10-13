"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2Icon, Loader2Icon, RotateCcwIcon, SendIcon, Trash2Icon } from "lucide-react";
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
  /** 이미 올린 글이 지금 계획 글(제목·본문)과 다름 */
  stale: boolean;
  /** 올리지 않기로 뺀 글 */
  skipped: boolean;
};

type State = {
  title: string;
  content: string;
  photos: string[];
  busy: boolean;
  error: string | null;
  doneId: string | null;
  stale: boolean;
  skipped: boolean;
};

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
        {
          title: item.title,
          content: item.content,
          photos: [],
          busy: false,
          error: null,
          doneId: item.publishedId,
          stale: item.stale,
          skipped: item.skipped,
        },
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

  /** 이미 올린 글을 지금 계획의 제목·본문으로 고칩니다(같은 글 주소·댓글은 그대로). */
  async function updatePublished(item: PublishItem) {
    const s = state[item.id];
    if (!s.doneId) return;
    patch(item.id, { busy: true, error: null });
    try {
      const response = await fetch(`/api/posts/${s.doneId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: item.title, content: item.content }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "고치지 못했습니다.");
      patch(item.id, { busy: false, stale: false, title: item.title });
    } catch (err) {
      patch(item.id, { busy: false, error: err instanceof Error ? err.message : "고치지 못했습니다." });
    }
  }

  /** 빼기·되돌리기(서버에 저장해서 새로고침·다른 기기에서도 유지) */
  async function setSkip(item: PublishItem, skip: boolean) {
    patch(item.id, { busy: true, error: null });
    const response = await fetch("/api/admin/content-plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id, skip }),
    }).catch(() => null);
    if (response?.ok) patch(item.id, { busy: false, skipped: skip });
    else patch(item.id, { busy: false, error: "저장하지 못했습니다. 다시 시도해 주세요." });
  }

  const active = items.filter((item) => !state[item.id].skipped);
  const skippedItems = items.filter((item) => state[item.id].skipped);
  const ready = active.filter((item) => !state[item.id].doneId && !problem(item, state[item.id]));
  const doneCount = active.filter((item) => state[item.id].doneId).length;

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
          올림 <b className="text-emerald-300">{doneCount}</b> / {active.length} · 바로 올릴 수 있는 글 <b className="text-[#e7c98a]">{ready.length}</b>개
          {skippedItems.length ? <span className="text-muted-foreground"> · 뺀 글 {skippedItems.length}개</span> : null}
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
        {active.map((item) => {
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
                <div className="mt-2 grid gap-2">
                  <p className="font-semibold">{s.title}</p>
                  {s.stale ? (
                    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[#c9a25c]/60 bg-[#2a2017] p-2.5">
                      <span className="min-w-0 flex-1 text-sm text-[#f3d9a4]">올린 글이 예전 내용이에요. 새 제목·본문으로 고칠까요? (글 주소·댓글은 그대로)</span>
                      <button
                        type="button"
                        data-update-published
                        disabled={s.busy}
                        onClick={() => void updatePublished(item)}
                        className="touch-target inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-[#c9a25c] px-4 text-sm font-bold text-[#1d1611] hover:bg-[#e7c98a] disabled:opacity-50"
                      >
                        {s.busy ? <Loader2Icon className="size-4 animate-spin" /> : <RotateCcwIcon className="size-4" />}
                        새 내용으로 고치기
                      </button>
                    </div>
                  ) : null}
                  {s.error ? <p className="text-sm font-semibold text-destructive">{s.error}</p> : null}
                </div>
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
                    <button
                      type="button"
                      disabled={s.busy || runningAll}
                      onClick={() => void setSkip(item, true)}
                      className="touch-target inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-rose-500/60 px-4 text-sm font-bold text-rose-300 hover:bg-rose-500/10 disabled:opacity-50"
                    >
                      <Trash2Icon className="size-4" />
                      빼기
                    </button>
                    {blocked && !s.error ? <span className="text-xs text-muted-foreground">{blocked}</span> : null}
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ol>

      {skippedItems.length ? (
        <section aria-label="뺀 글" className="rounded-2xl border border-dashed border-border p-3 sm:p-4">
          <p className="text-sm font-bold text-muted-foreground">뺀 글 {skippedItems.length}개 · 올리지 않습니다</p>
          <ul className="mt-2 grid gap-1.5">
            {skippedItems.map((item) => (
              <li key={item.id} className="flex flex-wrap items-center gap-2 rounded-lg bg-white/[0.03] px-3 py-2 text-sm">
                <span className="text-muted-foreground">
                  {item.day} {item.time} · {item.boardLabel}
                </span>
                <span className="min-w-0 flex-1 truncate text-muted-foreground line-through">{state[item.id].title}</span>
                <button
                  type="button"
                  disabled={state[item.id].busy}
                  onClick={() => void setSkip(item, false)}
                  className="touch-target inline-flex min-h-10 items-center gap-1 rounded-lg border border-border px-3 text-xs font-bold hover:bg-muted"
                >
                  <RotateCcwIcon className="size-3.5" />
                  되돌리기
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
