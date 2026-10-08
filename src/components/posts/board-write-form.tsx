"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { BoardType } from "@/generated/prisma/enums";
import { postRewardLine } from "@/lib/rewards";
import { StarPicker } from "@/components/reviews/star-picker";

export function BoardWriteForm({
  boardType,
  hint,
}: {
  boardType: BoardType;
  hint: string;
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [bannerSlot, setBannerSlot] = useState("");
  const [bannerImageUrl, setBannerImageUrl] = useState("");
  const [promoLocation, setPromoLocation] = useState("");
  const [promoTag, setPromoTag] = useState("");
  const [ratings, setRatings] = useState({
    ratingManner: 0,
    ratingService: 0,
    ratingFacility: 0,
    ratingAtmosphere: 0,
  });
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
          ...ratings,
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
    <div className="flex flex-col gap-4">
      <p className="rounded-xl border border-primary/40 bg-primary/10 px-3 py-2 text-sm font-medium text-foreground">
        {hint} · 작성 {postRewardLine(boardType)}
      </p>
      <div className="grid gap-2">
        <Label htmlFor="title">제목</Label>
        <Input
          id="title"
          className="h-11"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={
            boardType === "ANONYMOUS_REVIEW"
              ? "예: 서울 강남 홀덤펍 후기"
              : boardType === "HAND_REVIEW"
                ? "예: BTN vs BB AJs 3벳팟"
                : undefined
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
      {boardType === "ANONYMOUS_REVIEW" ? (
        <div className="grid gap-2">
          <p className="text-sm text-muted-foreground">매장 후기라면 별점(선택, 4항목 모두)</p>
          <StarPicker
            values={ratings}
            onChange={(key, value) => setRatings((prev) => ({ ...prev, [key]: value }))}
          />
        </div>
      ) : null}
      {boardType === "SKETCH" ? (
        <Field label="사진 URL" value={bannerImageUrl} onChange={setBannerImageUrl} placeholder="/banners/slot-4.svg" />
      ) : null}
      <div className="grid gap-2">
        <Label htmlFor="content">내용</Label>
        <Textarea
          id="content"
          className="min-h-36"
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
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
        {pending ? "등록 중…" : boardType === "ANONYMOUS_REVIEW" ? "익명으로 등록" : "등록"}
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
