"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { BoardType, JobKind } from "@/generated/prisma/enums";
import { POST_EXP } from "@/lib/rewards";

export function BoardWriteForm({
  boardType,
  jobKind,
  hint,
}: {
  boardType: BoardType;
  jobKind?: JobKind;
  hint: string;
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [jobLocation, setJobLocation] = useState("");
  const [jobPay, setJobPay] = useState("");
  const [jobSchedule, setJobSchedule] = useState("");
  const [jobHeadcount, setJobHeadcount] = useState("");
  const [isPaid, setIsPaid] = useState(false);
  const [bannerSlot, setBannerSlot] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

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
          jobKind,
          jobLocation,
          jobPay,
          jobSchedule,
          jobHeadcount,
          isPaid,
          bannerSlot: bannerSlot ? Number(bannerSlot) : null,
        }),
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
        {hint} · 작성 EXP +{POST_EXP[boardType]}
      </p>
      <div className="grid gap-2">
        <Label htmlFor="title">제목</Label>
        <Input id="title" className="h-11" value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      {boardType === "JOBS" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="지역" value={jobLocation} onChange={setJobLocation} placeholder="강남" />
          <Field label="페이/조건" value={jobPay} onChange={setJobPay} placeholder="시급 또는 세션비" />
          <Field label="일정" value={jobSchedule} onChange={setJobSchedule} placeholder="금·토 야간" />
          <Field label="인원" value={jobHeadcount} onChange={setJobHeadcount} placeholder="1명" />
          <label className="col-span-full flex min-h-11 items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isPaid}
              onChange={(event) => setIsPaid(event.target.checked)}
              className="size-5"
            />
            유료 상단 고정 플래그 (is_paid, 결제 연동 예정)
          </label>
        </div>
      ) : null}
      {boardType === "PROMO" ? (
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
