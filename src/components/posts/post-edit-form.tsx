"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DocEditor } from "@/components/docs/doc-editor";
import { DeletePostButton } from "@/components/posts/post-manage-bar";
import type { BoardType } from "@/generated/prisma/enums";

export type PostEditInitial = {
  title: string;
  content: string;
  promoLocation?: string | null;
  promoTag?: string | null;
  bannerImageUrl?: string | null;
};

/**
 * 자유·질문·현장 스케치·핸드리뷰·건의·공지·공식 홍보 글 수정.
 * 제목·본문을 고치고, 게시판에 따라 장소·태그·이미지 주소도 고칩니다.
 */
export function PostEditForm({
  postId,
  boardType,
  initial,
  listHref,
}: {
  postId: string;
  boardType: BoardType;
  initial: PostEditInitial;
  listHref: string;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(initial.title);
  const [content, setContent] = useState(initial.content);
  const [promoLocation, setPromoLocation] = useState(initial.promoLocation ?? "");
  const [promoTag, setPromoTag] = useState(initial.promoTag ?? "");
  const [imageUrl, setImageUrl] = useState(initial.bannerImageUrl ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const promo = boardType === "PROMO";
  const sketch = boardType === "SKETCH";

  async function submit() {
    setPending(true);
    setError(null);
    try {
      if (title.trim().length < 2) throw new Error("제목을 입력하세요.");
      if (!content.trim() && !promo) throw new Error("내용을 입력하세요.");
      const response = await fetch(`/api/posts/${postId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          content,
          ...(promo ? { promoLocation, promoTag, bannerImageUrl: imageUrl } : {}),
          ...(sketch ? { bannerImageUrl: imageUrl } : {}),
        }),
      });
      const payload = (await response.json()) as { id?: string; error?: string };
      if (!response.ok || !payload.id) throw new Error(payload.error ?? "저장에 실패했습니다.");
      router.replace(`/posts/${payload.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장에 실패했습니다.");
      setPending(false);
    }
  }

  return (
    <div className="ink-panel flex flex-col gap-4 rounded-2xl p-4 sm:p-5">
      {boardType === "HAND_REVIEW" ? (
        <p className="rounded-xl border border-primary/40 bg-primary/10 px-3 py-2 text-sm">
          제목과 본문만 고칠 수 있습니다. 그려 둔 핸드와 투표는 그대로 유지됩니다.
        </p>
      ) : null}
      <div className="grid gap-2">
        <Label htmlFor="edit-title" className="write-label">
          제목
        </Label>
        <Input id="edit-title" className="write-title-input" value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      {promo ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field id="edit-place" label="매장/장소" value={promoLocation} onChange={setPromoLocation} />
          <Field id="edit-tag" label="이벤트 태그" value={promoTag} onChange={setPromoTag} />
        </div>
      ) : null}
      {promo || sketch ? (
        <Field id="edit-image" label={promo ? "대표 이미지 URL" : "사진 URL"} value={imageUrl} onChange={setImageUrl} />
      ) : null}
      <div className="grid gap-2">
        <Label htmlFor="edit-content" className="write-label">
          내용
        </Label>
        {boardType === "NOTICE" ? (
          <DocEditor id="edit-content" title={title} value={content} onChange={setContent} />
        ) : (
          <Textarea id="edit-content" className="write-body-input" value={content} onChange={(e) => setContent(e.target.value)} />
        )}
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button type="button" size="touch" className="flex-1" disabled={pending} onClick={() => void submit()}>
          {pending ? "저장 중…" : "수정 저장"}
        </Button>
        <DeletePostButton postId={postId} afterHref={listHref} className="min-h-12 justify-center px-5" />
      </div>
    </div>
  );
}

function Field({ id, label, value, onChange }: { id: string; label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} className="h-11" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
