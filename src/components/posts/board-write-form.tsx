"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DocEditor } from "@/components/docs/doc-editor";
import type { BoardType } from "@/generated/prisma/enums";
import { postRewardLine } from "@/lib/rewards";
import { cn } from "cn";

export type BoardCategory = { boardType: BoardType; label: string };

export function BoardWriteForm({
  boardType: initialBoardType,
  hint,
  categories,
}: {
  boardType: BoardType;
  hint: string;
  /** 말머리. 주면 작성자가 고른 말머리가 게시판 종류가 됩니다. */
  categories?: BoardCategory[];
}) {
  const router = useRouter();
  const [boardType, setBoardType] = useState<BoardType>(initialBoardType);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [bannerSlot, setBannerSlot] = useState("");
  const [bannerImageUrl, setBannerImageUrl] = useState("");
  const [promoLocation, setPromoLocation] = useState("");
  const [promoTag, setPromoTag] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [isPrivate, setIsPrivate] = useState(boardType === "SUGGESTION");
  const [password, setPassword] = useState("");

  async function submit() {
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          boardType,
          title,
          content,
          bannerSlot: bannerSlot ? Number(bannerSlot) : null,
          bannerImageUrl,
          promoLocation,
          promoTag,
          isPrivate: boardType === "SUGGESTION" ? isPrivate : false,
          password: boardType === "SUGGESTION" ? password : undefined,
        }),
      });
      const payload = (await response.json()) as { id?: string; error?: string };
      if (response.status === 401) {
        router.replace("/login");
        return;
      }
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
      <p className="rounded-xl border border-primary/40 bg-primary/10 px-3 py-2 text-sm font-medium text-foreground">
        {hint} · 작성 {postRewardLine(boardType)}
      </p>
      {categories && categories.length > 1 ? (
        <div className="grid gap-2">
          <p className="write-label">말머리</p>
          <div role="radiogroup" aria-label="말머리" className="flex flex-wrap gap-1.5">
            {categories.map((category) => (
              <button
                key={category.boardType}
                type="button"
                role="radio"
                aria-checked={boardType === category.boardType}
                onClick={() => setBoardType(category.boardType)}
                className={cn(
                  "touch-target inline-flex min-h-10 items-center rounded-full border px-4 text-sm font-semibold",
                  boardType === category.boardType
                    ? "border-[#c9a25c] bg-[#c9a25c] text-[#1d1611]"
                    : "border-white/15 text-[#E5E7EB] hover:border-[#c9a25c]/60",
                )}
              >
                {category.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      <div className="grid gap-2">
        <Label htmlFor="title" className="write-label">제목</Label>
        <Input
          id="title"
          className="write-title-input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={
            boardType === "HAND_REVIEW"
              ? "예: BTN vs BB AJs 3벳팟"
              : boardType === "RULE_QA"
                ? "예: 올인 후 사이드팟 분배가 맞나요?"
                : "제목을 입력하세요"
          }
        />
      </div>
      {boardType === "PROMO" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="매장/장소" value={promoLocation} onChange={setPromoLocation} placeholder="강남" />
          <Field label="이벤트 태그" value={promoTag} onChange={setPromoTag} placeholder="나이트 · 첫방문 칩" />
          <Field
            label="대표 이미지 URL"
            value={bannerImageUrl}
            onChange={setBannerImageUrl}
            placeholder="/banners/slot-1.svg"
          />
          <div className="grid gap-2">
            <Label htmlFor="slot">프리미엄 배너 구좌 (선택, 1~6)</Label>
            <Input
              id="slot"
              className="h-11"
              inputMode="numeric"
              value={bannerSlot}
              onChange={(e) => setBannerSlot(e.target.value)}
              placeholder="비우면 일반 홍보글"
            />
          </div>
        </div>
      ) : null}
      {boardType === "SKETCH" ? (
        <Field label="사진 URL" value={bannerImageUrl} onChange={setBannerImageUrl} placeholder="/banners/slot-4.svg" />
      ) : null}
      <div className="grid gap-2">
        <Label htmlFor="content" className="write-label">내용</Label>
        {boardType === "NOTICE" ? (
          // 공지사항은 종이 문서(A4) 모양으로 보이므로 서식 버튼·미리보기가 있는 편집기를 씁니다.
          <DocEditor id="content" title={title} value={content} onChange={setContent} placeholder="내용을 입력하세요" />
        ) : (
          <Textarea
            id="content"
            className="write-body-input"
            placeholder="내용을 입력하세요"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
        )}
      </div>
      {boardType === "SUGGESTION" ? (
        <fieldset className="rounded-xl border border-border bg-muted/40 p-3">
          <legend className="px-1 text-sm font-semibold">비밀글</legend>
          <label className="flex min-h-11 items-center gap-2 text-sm">
            <span className="touch-check">
              <input
                type="checkbox"
                checked={isPrivate}
                onChange={(event) => setIsPrivate(event.target.checked)}
              />
            </span>
            비밀글 설정
          </label>
          {isPrivate ? (
            <div className="mt-2 grid gap-2">
              <Label htmlFor="secret-password">비밀번호 (4자리 이상)</Label>
              <Input
                id="secret-password"
                type="password"
                minLength={4}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="본문 열람용 비밀번호"
              />
            </div>
          ) : null}
        </fieldset>
      ) : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="button" size="touch" disabled={pending} onClick={submit}>
        {pending ? "등록 중…" : "등록"}
      </Button>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      <Input
        className="h-11"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
