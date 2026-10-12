"use client";

import { useRef, useState } from "react";
import { ImageUpIcon, Loader2Icon } from "lucide-react";
import { fitPosterImage } from "@/lib/poster-fit";
import { POSTER_SIZE } from "@/lib/inventory-policy";

/**
 * 공식 홍보물 사진 올리기. 고른 사진을 세로 포스터(5:7)에 맞춰 자동 정렬한 뒤 올립니다.
 * value: 올린 이미지 주소("/api/images/…"). 비어 있으면 기본 이미지가 쓰입니다.
 */
export function PromoImageUpload({ value, onChange }: { value: string; onChange: (url: string) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const shown = value && !value.startsWith("/banners/") ? value : "";

  async function onPick(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setNote(null);
    try {
      if (!file.type.startsWith("image/")) throw new Error("사진 파일을 골라 주세요.");
      const form = new FormData();
      form.append("file", await fitPosterImage(file));
      const response = await fetch("/api/uploads/image", { method: "POST", body: form });
      const payload = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !payload.url) throw new Error(payload.error ?? "사진을 올리지 못했습니다.");
      onChange(payload.url);
      setNote({ ok: true, text: "홍보 칸에 맞춰 올렸습니다. 사진이 잘리지 않게 가운데 정렬됩니다." });
    } catch (err) {
      setNote({ ok: false, text: err instanceof Error ? err.message : "사진을 올리지 못했습니다." });
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="grid gap-3 rounded-xl border border-[#c9a25c]/50 bg-[#141110] p-3 sm:grid-cols-[9rem_1fr]">
      <button
        type="button"
        disabled={busy}
        onClick={() => fileRef.current?.click()}
        aria-label={shown ? "홍보물 사진 바꾸기" : "홍보물 사진 올리기"}
        className="relative mx-auto grid aspect-[5/7] w-32 place-items-center overflow-hidden rounded-lg border border-dashed border-[#c9a25c]/60 bg-[#1d1611] text-[#e7c98a] hover:bg-[#241c16] sm:w-36"
      >
        {shown ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={shown} alt="올린 홍보물" className="absolute inset-0 size-full object-cover" />
        ) : (
          <span className="grid justify-items-center gap-1 text-xs font-bold">
            <ImageUpIcon className="size-8" />
            사진 올리기
          </span>
        )}
        {busy ? (
          <span className="absolute inset-0 grid place-items-center bg-black/60 text-xs font-bold text-white">
            <span className="grid justify-items-center gap-1">
              <Loader2Icon className="size-6 animate-spin" />
              올리는 중…
            </span>
          </span>
        ) : null}
      </button>
      <div className="grid content-start gap-2 text-sm">
        <p className="font-bold text-[#e7c98a]">공식 홍보물 사진</p>
        <p className="text-xs leading-5 text-[#c9c0b2]">
          휴대폰 사진·포스터 아무 크기나 올리면 메인 홍보 칸({POSTER_SIZE})에 맞춰 자동으로 정렬됩니다. 비율이 다르면
          사진이 잘리지 않게 가운데 두고, 남는 곳은 같은 사진을 흐리게 채웁니다.
        </p>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(event) => void onPick(event.target.files?.[0])}
        />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => fileRef.current?.click()}
            className="touch-target inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-[#8b2222] px-4 text-sm font-bold text-white hover:bg-[#a12a2a]"
          >
            <ImageUpIcon className="size-4" />
            {shown ? "사진 바꾸기" : "사진 올리기"}
          </button>
          {shown ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                onChange("");
                setNote(null);
              }}
              className="touch-target inline-flex min-h-11 items-center rounded-xl border border-border px-4 text-sm font-semibold hover:bg-muted"
            >
              사진 빼기
            </button>
          ) : null}
        </div>
        {note ? <p className={note.ok ? "text-xs text-emerald-300" : "text-xs text-destructive"}>{note.text}</p> : null}
      </div>
    </div>
  );
}
