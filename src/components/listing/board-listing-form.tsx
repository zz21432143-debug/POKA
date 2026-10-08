"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { BoardType } from "@/generated/prisma/enums";
import { APPLY_METHODS, PAY_TYPES, POSITIONS, REGIONS, applyPlaceholder } from "@/lib/listing";
import { postRewardLine } from "@/lib/rewards";

export function BoardListingForm({
  boardType,
  hint,
  mode,
}: {
  boardType: BoardType;
  hint: string;
  mode: "talent" | "pickup" | "poster" | "schedule";
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [positions, setPositions] = useState<string[]>([]);
  const [region, setRegion] = useState<(typeof REGIONS)[number]>(REGIONS[0]);
  const [payType, setPayType] = useState<(typeof PAY_TYPES)[number]>("일급");
  const [payAmount, setPayAmount] = useState("");
  const [applyMethod, setApplyMethod] = useState<(typeof APPLY_METHODS)[number]>("카카오톡 ID·링크");
  const [applyValue, setApplyValue] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function toggle(value: string) {
    setPositions((prev) => (prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]));
  }

  async function submit() {
    setPending(true);
    setError(null);
    try {
      if (title.trim().length < 2) throw new Error("제목을 입력하세요.");
      const body: Record<string, unknown> = { boardType, title, content };
      if (mode === "talent" || mode === "pickup") {
        body.jobPositions = positions;
        body.jobLocation = [region];
        body.jobApplyMethod = applyMethod;
        body.jobApplyValue = applyValue;
      }
      if (mode === "pickup") {
        body.jobPayType = payType;
        body.jobPayAmount = payAmount;
        body.jobWorkDate = eventDate;
        body.jobWorkType = "단기 이벤트 스태프";
      }
      if (mode === "poster") body.bannerImageUrl = imageUrl || `/banners/slot-${mode === "poster" ? 2 : 1}.svg`;
      if (mode === "schedule") {
        if (!eventDate) throw new Error("대회 날짜를 선택하세요.");
        body.eventDate = eventDate;
        body.promoLocation = region;
      }
      const response = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = (await response.json()) as { id?: string; error?: string };
      if (!response.ok || !payload.id) throw new Error(payload.error ?? "저장에 실패했습니다.");
      router.push(`/posts/${payload.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장에 실패했습니다.");
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="rounded-xl border border-primary/40 bg-primary/10 px-3 py-2 text-sm">
        {hint} · 작성 {postRewardLine(boardType)}
      </p>
      <div className="grid gap-2">
        <Label htmlFor="title">제목</Label>
        <Input id="title" className="h-11" value={title} onChange={(event) => setTitle(event.target.value)} />
      </div>
      {mode === "poster" ? (
        <div className="grid gap-2">
          <Label htmlFor="image">포스터 이미지 URL</Label>
          <Input
            id="image"
            className="h-11"
            value={imageUrl}
            placeholder="/banners/slot-1.svg"
            onChange={(event) => setImageUrl(event.target.value)}
          />
        </div>
      ) : null}
      {mode === "schedule" || mode === "pickup" ? (
        <div className="grid gap-2">
          <Label htmlFor="date">{mode === "schedule" ? "대회 날짜" : "근무 날짜"}</Label>
          <Input
            id="date"
            type="date"
            className="h-11 text-base"
            value={eventDate}
            onChange={(event) => setEventDate(event.target.value)}
          />
        </div>
      ) : null}
      {mode === "talent" || mode === "pickup" || mode === "schedule" ? (
        <div className="grid gap-2">
          <Label htmlFor="region">지역</Label>
          <select
            id="region"
            className="h-11 w-full rounded-lg border border-input bg-background px-2 text-base"
            value={region}
            onChange={(event) => setRegion(event.target.value as (typeof REGIONS)[number])}
          >
            {REGIONS.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </div>
      ) : null}
      {mode === "talent" || mode === "pickup" ? (
        <fieldset>
          <legend className="mb-2 text-sm font-medium">포지션</legend>
          <div className="grid grid-cols-2 gap-2">
            {POSITIONS.map((item) => (
              <label key={item} className="flex min-h-11 items-center gap-2 text-sm">
                <input type="checkbox" className="size-5" checked={positions.includes(item)} onChange={() => toggle(item)} />
                {item}
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}
      {mode === "pickup" ? (
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label>급여</Label>
            <select
              className="h-11 rounded-lg border border-input bg-background px-2 text-base"
              value={payType}
              onChange={(event) => setPayType(event.target.value as (typeof PAY_TYPES)[number])}
            >
              {PAY_TYPES.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </div>
          <div className="grid gap-2">
            <Label>금액</Label>
            <Input className="h-11" value={payAmount} onChange={(event) => setPayAmount(event.target.value)} />
          </div>
        </div>
      ) : null}
      {mode === "talent" || mode === "pickup" ? (
        <>
          <div className="grid gap-2">
            <Label>지원·연락 방법</Label>
            <select
              className="h-11 rounded-lg border border-input bg-background px-2 text-base"
              value={applyMethod}
              onChange={(event) => setApplyMethod(event.target.value as (typeof APPLY_METHODS)[number])}
            >
              {APPLY_METHODS.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </div>
          {applyMethod !== "사이트 내 직접 지원" ? (
            <Input
              className="h-11"
              placeholder={applyPlaceholder(applyMethod)}
              value={applyValue}
              onChange={(event) => setApplyValue(event.target.value)}
            />
          ) : null}
        </>
      ) : null}
      <div className="grid gap-2">
        <Label htmlFor="content">{mode === "talent" ? "이력·프로필" : "상세 내용"}</Label>
        <Textarea id="content" className="min-h-32" value={content} onChange={(event) => setContent(event.target.value)} />
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="button" size="touch" disabled={pending} onClick={() => void submit()}>
        {pending ? "등록 중…" : "등록"}
      </Button>
    </div>
  );
}
