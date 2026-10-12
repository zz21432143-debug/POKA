"use client";

import { useRef, useState } from "react";
import { ImagePlusIcon, Loader2Icon, XIcon } from "lucide-react";
import { shrinkPhoto } from "@/lib/poster-fit";
import { MAX_POST_PHOTOS } from "@/lib/post-photos";

/**
 * 글 사진 첨부(최대 5장). 사진을 고르면 크기를 줄여 바로 올리고, 미리보기에서 빼거나 순서대로 보여 줍니다.
 * value: 올린 사진 주소 목록("/api/images/…")
 */
export function PostPhotoPicker({ value, onChange }: { value: string[]; onChange: (urls: string[]) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const left = MAX_POST_PHOTOS - value.length;

  async function onPick(list: FileList | null) {
    const files = Array.from(list ?? []).slice(0, Math.max(0, left));
    if (fileRef.current) fileRef.current.value = "";
    if (!files.length) return;
    setError(null);
    setBusy(files.length);
    const added: string[] = [];
    try {
      for (const file of files) {
        if (!file.type.startsWith("image/")) throw new Error("사진 파일만 올릴 수 있습니다.");
        const form = new FormData();
        form.append("file", await shrinkPhoto(file));
        const response = await fetch("/api/uploads/image", { method: "POST", body: form });
        const payload = (await response.json().catch(() => ({}))) as { url?: string; error?: string };
        if (!response.ok || !payload.url) throw new Error(payload.error ?? "사진을 올리지 못했습니다.");
        added.push(payload.url);
        setBusy((n) => n - 1);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "사진을 올리지 못했습니다.");
    } finally {
      if (added.length) onChange([...value, ...added].slice(0, MAX_POST_PHOTOS));
      setBusy(0);
    }
  }

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="write-label">사진 <span className="text-sm font-normal text-[#9CA3AF]">({value.length}/{MAX_POST_PHOTOS}, 선택)</span></p>
        <button
          type="button"
          disabled={busy > 0 || left <= 0}
          onClick={() => fileRef.current?.click()}
          className="touch-target inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-[#c9a25c]/60 px-4 text-sm font-bold text-[#e7c98a] hover:bg-[#c9a25c]/10 disabled:opacity-50"
        >
          {busy > 0 ? <Loader2Icon className="size-4 animate-spin" /> : <ImagePlusIcon className="size-4" />}
          {busy > 0 ? `올리는 중… (${busy})` : "사진 추가"}
        </button>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        aria-label="사진 고르기"
        onChange={(event) => void onPick(event.target.files)}
      />
      {value.length > 0 ? (
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {value.map((url, index) => (
            <li key={url} className="relative aspect-square overflow-hidden rounded-lg border border-white/10 bg-black">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt={`첨부 사진 ${index + 1}`} className="size-full object-cover" />
              <button
                type="button"
                onClick={() => onChange(value.filter((item) => item !== url))}
                aria-label={`사진 ${index + 1} 빼기`}
                className="absolute top-1 right-1 grid size-8 place-items-center rounded-full bg-black/75 text-white hover:bg-[#8b2222]"
              >
                <XIcon className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-[#9CA3AF]">휴대폰 사진을 그대로 골라도 자동으로 줄여서 올립니다. 최대 {MAX_POST_PHOTOS}장.</p>
      )}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
