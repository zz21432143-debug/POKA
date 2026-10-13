"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2Icon, Trash2Icon } from "lucide-react";

function mb(bytes: number) {
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

/** 데이터 정리 버튼 묶음: 예전 개인 구직 글 · 안 쓰는 사진 */
export function CleanupPanel({ seeking, images, imageBytes }: { seeking: number; images: number; imageBytes: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<Record<string, string>>({});

  async function run(action: "seeking" | "images", question: string) {
    if (!window.confirm(question)) return;
    setBusy(action);
    try {
      const res = await fetch("/api/admin/cleanup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
      const data = (await res.json().catch(() => ({}))) as { deleted?: number; bytes?: number; error?: string };
      if (!res.ok) throw new Error(data.error ?? "정리하지 못했습니다.");
      setNote((prev) => ({ ...prev, [action]: action === "images" ? `사진 ${data.deleted}개(${mb(data.bytes ?? 0)})를 지웠어요.` : `글 ${data.deleted}개를 지웠어요.` }));
      router.refresh();
    } catch (e) {
      setNote((prev) => ({ ...prev, [action]: (e as Error).message }));
    } finally {
      setBusy(null);
    }
  }

  const btn = "inline-flex min-h-11 w-fit items-center gap-1.5 rounded-xl bg-[#8b2222] px-4 text-sm font-bold text-white hover:bg-[#a12a2a] disabled:opacity-50";
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <section aria-label="예전 개인 구직 글" className="grid content-start gap-2 rounded-2xl border border-border bg-card p-4">
        <h2 className="text-lg font-semibold">예전 개인 구직 글</h2>
        <p className="text-sm text-muted-foreground">운영을 끝낸 개인 구직 글입니다. 본명 · 연락처가 담겨 있어 완전히 지웁니다(댓글 등 함께 삭제, 되돌릴 수 없음).</p>
        <p data-seeking-count className="text-3xl font-black text-[#e7c98a]">{seeking.toLocaleString()}개</p>
        <button type="button" data-purge-seeking disabled={busy !== null || seeking === 0} onClick={() => void run("seeking", `개인 구직 글 ${seeking}개를 완전히 지울까요? 되돌릴 수 없어요.`)} className={btn}>
          {busy === "seeking" ? <Loader2Icon className="size-4 animate-spin" /> : <Trash2Icon className="size-4" />}
          모두 지우기
        </button>
        {note.seeking ? <p className="text-sm font-semibold">{note.seeking}</p> : null}
      </section>
      <section aria-label="안 쓰는 사진" className="grid content-start gap-2 rounded-2xl border border-border bg-card p-4">
        <h2 className="text-lg font-semibold">안 쓰는 사진</h2>
        <p className="text-sm text-muted-foreground">올린 지 7일이 지났는데 어떤 글 · 배너 · 현황판에도 쓰이지 않는 사진입니다. 지우면 DB 용량이 줄어요.</p>
        <p data-image-count className="text-3xl font-black text-[#e7c98a]">
          {images.toLocaleString()}개 <span className="text-base font-bold text-muted-foreground">· {mb(imageBytes)}</span>
        </p>
        <button type="button" data-purge-images disabled={busy !== null || images === 0} onClick={() => void run("images", `안 쓰는 사진 ${images}개를 지울까요?`)} className={btn}>
          {busy === "images" ? <Loader2Icon className="size-4 animate-spin" /> : <Trash2Icon className="size-4" />}
          정리하기
        </button>
        {note.images ? <p className="text-sm font-semibold">{note.images}</p> : null}
      </section>
    </div>
  );
}
