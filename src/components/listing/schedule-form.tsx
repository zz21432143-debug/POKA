"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ImageUpIcon, Loader2Icon, SparklesIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DateField } from "@/components/jobs/date-picker";
import { postRewardLine } from "@/lib/rewards";
import type { PosterFields } from "@/lib/poster-analyze";

/** 긴 변 1600px JPEG로 줄여 업로드 용량과 AI 분석 시간을 줄입니다. */
async function shrinkImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("이미지를 줄이지 못했습니다."))), "image/jpeg", 0.85),
  );
}

type Step = "idle" | "uploading" | "analyzing";

export function ScheduleForm({ hint }: { hint: string }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [venue, setVenue] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [prize, setPrize] = useState("");
  const [poster, setPoster] = useState("");
  const [link, setLink] = useState("");
  const [content, setContent] = useState("");
  const [step, setStep] = useState<Step>("idle");
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  /** AI가 찾은 값으로 칸을 채웁니다. 못 찾은 칸은 지금 값을 그대로 둡니다. */
  function fill(fields: PosterFields) {
    if (fields.title) setTitle(fields.title);
    if (fields.location) setVenue(fields.location);
    if (fields.startDate) setStart(fields.startDate);
    if (fields.endDate) setEnd(fields.endDate);
    if (fields.totalPrize) setPrize(fields.totalPrize);
    if (fields.description) setContent(fields.description);
    if (fields.link) setLink(fields.link);
    const found = [
      fields.title && "대회명",
      fields.location && "장소",
      fields.startDate && "날짜",
      fields.totalPrize && "총상금",
      fields.description && "상세 내용",
    ].filter(Boolean);
    setNote({ ok: true, text: `포스터에서 ${found.join(", ") || "내용"}을(를) 채웠습니다. 틀린 곳이 없는지 확인하세요.` });
  }

  async function analyze(url: string) {
    setStep("analyzing");
    const response = await fetch("/api/schedule/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    const payload = (await response.json()) as { fields?: PosterFields; error?: string };
    if (!response.ok || !payload.fields) throw new Error(payload.error ?? "포스터를 읽지 못했습니다.");
    fill(payload.fields);
  }

  async function onPick(file: File | undefined) {
    if (!file) return;
    setNote(null);
    setStep("uploading");
    try {
      const blob = await shrinkImage(file);
      const form = new FormData();
      form.append("file", new File([blob], "poster.jpg", { type: "image/jpeg" }));
      const response = await fetch("/api/uploads/image", { method: "POST", body: form });
      const payload = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !payload.url) throw new Error(payload.error ?? "이미지를 올리지 못했습니다.");
      setPoster(payload.url);
      await analyze(payload.url);
    } catch (err) {
      setNote({ ok: false, text: err instanceof Error ? err.message : "포스터 처리에 실패했습니다." });
    } finally {
      setStep("idle");
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function submit() {
    setPending(true);
    setError(null);
    try {
      if (title.trim().length < 2) throw new Error("대회명을 입력하세요.");
      if (!start) throw new Error("시작일을 선택하세요.");
      if (end && end < start) throw new Error("종료일이 시작일보다 빠릅니다.");
      const response = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          boardType: "SCHEDULE",
          title,
          content,
          promoLocation: venue,
          eventDate: start,
          eventEndDate: end || start,
          eventPrize: prize,
          eventLink: link,
          bannerImageUrl: poster || "/banners/slot-3.svg",
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

  const busy = step !== "idle";

  return (
    <div className="ink-panel flex flex-col gap-4 rounded-2xl p-4 sm:p-5">
      <p className="rounded-xl border border-primary/40 bg-primary/10 px-3 py-2 text-sm">
        {hint} · 작성 {postRewardLine("SCHEDULE")}
      </p>

      <section
        aria-label="포스터로 자동 채우기"
        className="grid gap-3 rounded-xl border-2 border-[#FEE500] bg-gradient-to-b from-[#FEE500]/[0.14] to-[#FEE500]/[0.03] p-3 sm:grid-cols-[9rem_1fr]"
      >
        <button
          type="button"
          disabled={busy}
          onClick={() => fileRef.current?.click()}
          className="relative grid aspect-[3/4] w-full place-items-center overflow-hidden rounded-lg border border-dashed border-[#FEE500]/60 bg-[#141110] text-[#FEE500] hover:bg-[#1d1a14] sm:w-36"
        >
          {poster ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={poster} alt="올린 포스터" className="absolute inset-0 size-full object-cover" />
          ) : (
            <span className="grid justify-items-center gap-1 text-xs font-bold">
              <ImageUpIcon className="size-7" />
              포스터 올리기
            </span>
          )}
          {busy ? (
            <span className="absolute inset-0 grid place-items-center bg-black/60 text-xs font-bold text-white">
              <span className="grid justify-items-center gap-1">
                <Loader2Icon className="size-6 animate-spin" />
                {step === "uploading" ? "올리는 중…" : "포스터 읽는 중…"}
              </span>
            </span>
          ) : null}
        </button>
        <div className="grid content-start gap-2">
          <p className="flex items-center gap-1.5 text-base font-black text-[#FEE500]">
            <SparklesIcon className="size-5" />
            포스터 올리면 자동 채우기
          </p>
          <p className="text-xs text-[#f3eccd]">
            대회 포스터 이미지를 올리면 AI가 글자를 읽어 대회명·장소·날짜·총상금·상세 내용을 채우고, 포스터 주소도 넣어 줍니다.
          </p>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={(event) => void onPick(event.target.files?.[0])}
          />
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              disabled={busy}
              className="min-h-11 gap-1.5 bg-[#FEE500] font-black text-[#1d1611] hover:bg-[#ffeb3b]"
              onClick={() => fileRef.current?.click()}
            >
              <ImageUpIcon className="size-4" />
              {poster ? "다른 포스터 올리기" : "포스터 이미지 고르기"}
            </Button>
            {poster ? (
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                className="min-h-11 border-[#FEE500]/60 text-[#FEE500]"
                onClick={() => {
                  setNote(null);
                  analyze(poster)
                    .catch((err) => setNote({ ok: false, text: err instanceof Error ? err.message : "다시 읽지 못했습니다." }))
                    .finally(() => setStep("idle"));
                }}
              >
                다시 읽기
              </Button>
            ) : null}
          </div>
          {note ? (
            <p
              className={
                note.ok
                  ? "rounded-lg bg-[#FEE500]/10 px-2.5 py-1.5 text-xs font-semibold text-[#FEE500]"
                  : "rounded-lg bg-rose-500/10 px-2.5 py-1.5 text-xs font-semibold text-rose-300"
              }
            >
              {note.text}
            </p>
          ) : null}
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-2 sm:col-span-2">
          <Label htmlFor="name" className="write-label">대회명</Label>
          <Input
            id="name"
            className="write-title-input"
            value={title}
            placeholder="예: 서울 홀덤 위클리"
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div className="grid gap-2 sm:col-span-2">
          <Label htmlFor="venue">개최 장소</Label>
          <Input id="venue" className="h-11" value={venue} placeholder="서울 코엑스" onChange={(e) => setVenue(e.target.value)} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="start">시작일</Label>
          <DateField id="start" value={start} onChange={setStart} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="end">종료일</Label>
          <DateField id="end" value={end} onChange={setEnd} placeholder="하루면 비워 두세요" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="prize">총상금</Label>
          <Input id="prize" className="h-11" value={prize} placeholder="₩500,000,000" onChange={(e) => setPrize(e.target.value)} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="link">공식 링크</Label>
          <Input id="link" className="h-11" value={link} placeholder="https://" onChange={(e) => setLink(e.target.value)} />
        </div>
        <div className="grid gap-2 sm:col-span-2">
          <Label htmlFor="poster">포스터 이미지 URL</Label>
          <Input
            id="poster"
            className="h-11"
            value={poster}
            placeholder="포스터를 올리면 자동으로 들어갑니다"
            onChange={(e) => setPoster(e.target.value)}
          />
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="content" className="write-label">상세 내용</Label>
        <Textarea id="content" className="write-body-input" value={content} onChange={(e) => setContent(e.target.value)} />
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="button" size="touch" disabled={pending || busy} onClick={() => void submit()}>
        {pending ? "등록 중…" : "일정 등록"}
      </Button>
    </div>
  );
}
