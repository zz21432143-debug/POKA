"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ClipboardPasteIcon, ImageUpIcon, Loader2Icon, SparklesIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DateField } from "@/components/jobs/date-picker";
import { postRewardLine } from "@/lib/rewards";
import { todayKstDate } from "@/lib/dates";
import { parseScheduleText } from "@/lib/schedule-parse";
import { imageIdFromUrl } from "@/lib/uploads";
import type { PosterFields } from "@/lib/poster-analyze";

/** 긴 변 1600px JPEG로 줄여 업로드 용량을 줄입니다. */
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
type Note = { ok: boolean; text: string } | null;

const PASTE_EXAMPLE = [
  "【 POKA 홀덤 챔피언십 2026 】",
  "일시 : 2026.11.14(토) - 11.16(월)",
  "장소 : POKA호텔 3층 베리언스 룸",
  "총상금 : GTD 3억",
  "바이인 330,000원 · 리엔트리 1회",
  "https://…",
].join("\n");

/**
 * 대회 캘린더 등록. 두 가지 방법을 함께 씁니다.
 * A. 대회 안내 글을 붙여넣으면 대회명·장소·날짜·총상금·링크·상세 내용으로 자동으로 나눕니다(비용 없음).
 * B. 포스터 이미지를 올리거나 주소를 넣으면 캘린더 상세 창과 게시글에 그대로 보입니다.
 *    포스터 글자를 AI로 읽는 기능은 선택(유료)이며 누를 때만 동작합니다.
 */
export function ScheduleForm({ hint }: { hint: string }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [paste, setPaste] = useState("");
  const [title, setTitle] = useState("");
  const [venue, setVenue] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [prize, setPrize] = useState("");
  const [poster, setPoster] = useState("");
  const [link, setLink] = useState("");
  const [content, setContent] = useState("");
  const [step, setStep] = useState<Step>("idle");
  const [pasteNote, setPasteNote] = useState<Note>(null);
  const [posterNote, setPosterNote] = useState<Note>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  /** A. 붙여넣은 글을 칸별로 나눕니다. 찾은 값만 채우고 원문은 상세 내용으로 넣습니다. */
  function applyPaste() {
    if (!paste.trim()) {
      setPasteNote({ ok: false, text: "대회 안내 글을 붙여넣어 주세요." });
      return;
    }
    const p = parseScheduleText(paste, todayKstDate());
    if (p.title) setTitle(p.title);
    if (p.location) setVenue(p.location);
    if (p.startDate) setStart(p.startDate);
    if (p.endDate) setEnd(p.endDate);
    if (p.totalPrize) setPrize(p.totalPrize);
    if (p.link) setLink(p.link);
    setContent(p.description);
    const found = [p.title && "대회명", p.location && "장소", p.startDate && "날짜", p.totalPrize && "총상금", p.link && "링크"].filter(Boolean);
    const missing = [!p.location && "장소", !p.startDate && "날짜", !p.totalPrize && "총상금"].filter(Boolean);
    setPasteNote({
      ok: true,
      text: `${found.join(", ") || "상세 내용"}을(를) 채웠습니다.${missing.length ? ` ${missing.join(", ")}은(는) 찾지 못했으니 직접 넣어 주세요.` : ""}`,
    });
  }

  /** B. 포스터 이미지를 올려 주소를 넣습니다. AI 분석은 하지 않습니다. */
  async function onPick(file: File | undefined) {
    if (!file) return;
    setPosterNote(null);
    setStep("uploading");
    try {
      const blob = await shrinkImage(file);
      const form = new FormData();
      form.append("file", new File([blob], "poster.jpg", { type: "image/jpeg" }));
      const response = await fetch("/api/uploads/image", { method: "POST", body: form });
      const payload = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !payload.url) throw new Error(payload.error ?? "이미지를 올리지 못했습니다.");
      setPoster(payload.url);
      setPosterNote({ ok: true, text: "포스터를 첨부했습니다. 캘린더 상세 창과 게시글에 그대로 보입니다." });
    } catch (err) {
      setPosterNote({ ok: false, text: err instanceof Error ? err.message : "포스터를 올리지 못했습니다." });
    } finally {
      setStep("idle");
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  /** 선택: 올린 포스터 글자를 AI로 읽어 빈칸을 채웁니다(서버에 ANTHROPIC_API_KEY가 있을 때만, 1회당 요금 발생). */
  async function analyze() {
    setPosterNote(null);
    setStep("analyzing");
    try {
      const response = await fetch("/api/schedule/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: poster }),
      });
      const payload = (await response.json()) as { fields?: PosterFields; error?: string };
      if (!response.ok || !payload.fields) throw new Error(payload.error ?? "포스터를 읽지 못했습니다.");
      const f = payload.fields;
      if (f.title && !title) setTitle(f.title);
      if (f.location && !venue) setVenue(f.location);
      if (f.startDate && !start) setStart(f.startDate);
      if (f.endDate && !end) setEnd(f.endDate);
      if (f.totalPrize && !prize) setPrize(f.totalPrize);
      if (f.link && !link) setLink(f.link);
      if (f.description && !content) setContent(f.description);
      setPosterNote({ ok: true, text: "포스터 글자로 빈칸을 채웠습니다. 이미 적은 칸은 그대로 두었습니다." });
    } catch (err) {
      setPosterNote({ ok: false, text: err instanceof Error ? err.message : "포스터를 읽지 못했습니다." });
    } finally {
      setStep("idle");
    }
  }

  async function submit() {
    setPending(true);
    setError(null);
    try {
      if (title.trim().length < 2) throw new Error("대회명을 입력하세요.");
      if (!start) throw new Error("시작일을 선택하세요.");
      if (end && end < start) throw new Error("종료일이 시작일보다 빠릅니다.");
      if (poster && !/^(https?:\/\/|\/api\/images\/)/.test(poster.trim())) {
        throw new Error("포스터 이미지 주소는 https:// 로 시작해야 합니다.");
      }
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
          bannerImageUrl: poster.trim() || "/banners/slot-3.svg",
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
  const noteClass = (n: NonNullable<Note>) =>
    n.ok
      ? "rounded-lg bg-[#FEE500]/10 px-2.5 py-1.5 text-xs font-semibold text-[#FEE500]"
      : "rounded-lg bg-rose-500/10 px-2.5 py-1.5 text-xs font-semibold text-rose-300";

  return (
    <div className="ink-panel flex flex-col gap-4 rounded-2xl p-4 sm:p-5">
      <p className="rounded-xl border border-primary/40 bg-primary/10 px-3 py-2 text-sm">
        {hint} · 작성 {postRewardLine("SCHEDULE")}
      </p>

      {/* 방식 A: 글 붙여넣기 */}
      <section
        aria-label="방식 A 대회 안내 글 붙여넣기"
        className="grid gap-2 rounded-xl border-2 border-[#FEE500] bg-gradient-to-b from-[#FEE500]/[0.14] to-[#FEE500]/[0.03] p-3"
      >
        <p className="flex items-center gap-2 text-base font-black text-[#FEE500]">
          <span className="rounded-md bg-[#FEE500] px-1.5 text-sm text-[#1d1611]">A</span>
          대회 안내 글 붙여넣기 → 자동 나누기
        </p>
        <p className="text-xs text-[#f3eccd]">
          카톡·인스타·홈페이지의 대회 안내 글을 그대로 붙여넣으세요. 대회명·장소·시작일·종료일·총상금·링크로 나누고, 원문은 상세 내용에 넣습니다.
        </p>
        <Textarea
          className="min-h-36 border-[#FEE500]/50 bg-[#141110] font-mono text-sm leading-relaxed"
          placeholder={PASTE_EXAMPLE}
          value={paste}
          onChange={(event) => setPaste(event.target.value)}
        />
        <Button
          type="button"
          className="min-h-12 gap-1.5 bg-[#FEE500] text-base font-black text-[#1d1611] hover:bg-[#ffeb3b]"
          onClick={applyPaste}
        >
          <ClipboardPasteIcon className="size-5" />
          자동 나누기
        </Button>
        {pasteNote ? <p className={noteClass(pasteNote)}>{pasteNote.text}</p> : null}
      </section>

      {/* 방식 B: 포스터 첨부 */}
      <section aria-label="방식 B 포스터 첨부" className="grid gap-3 rounded-xl border border-[#c9a25c]/50 bg-[#141110] p-3 sm:grid-cols-[8rem_1fr]">
        <button
          type="button"
          disabled={busy}
          onClick={() => fileRef.current?.click()}
          className="relative grid aspect-[3/4] w-28 place-items-center overflow-hidden rounded-lg border border-dashed border-[#c9a25c]/60 bg-[#1d1611] text-[#e7c98a] hover:bg-[#241c16] sm:w-32"
        >
          {poster ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={poster} alt="첨부한 포스터" className="absolute inset-0 size-full object-cover" />
          ) : (
            <span className="grid justify-items-center gap-1 text-xs font-bold">
              <ImageUpIcon className="size-7" />
              포스터 첨부
            </span>
          )}
          {busy ? (
            <span className="absolute inset-0 grid place-items-center bg-black/60 text-xs font-bold text-white">
              <span className="grid justify-items-center gap-1">
                <Loader2Icon className="size-6 animate-spin" />
                {step === "uploading" ? "올리는 중…" : "읽는 중…"}
              </span>
            </span>
          ) : null}
        </button>
        <div className="grid content-start gap-2">
          <p className="flex items-center gap-2 text-base font-black text-[#e7c98a]">
            <span className="rounded-md bg-[#c9a25c] px-1.5 text-sm text-[#1d1611]">B</span>
            포스터 첨부
          </p>
          <p className="text-xs text-[#c9c0b2]">이미지를 올리거나 주소를 넣으면 캘린더 상세 창과 게시글에 포스터가 그대로 보입니다.</p>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={(event) => void onPick(event.target.files?.[0])}
          />
          <div className="flex gap-1.5">
            <Input
              id="poster"
              aria-label="포스터 이미지 URL"
              className="h-11"
              value={poster}
              placeholder="포스터 이미지 URL (https://…)"
              onChange={(e) => setPoster(e.target.value)}
            />
            {poster ? (
              <Button type="button" variant="ghost" className="h-11 px-2" aria-label="포스터 빼기" onClick={() => setPoster("")}>
                <XIcon className="size-4" />
              </Button>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" disabled={busy} className="min-h-11 gap-1.5" onClick={() => fileRef.current?.click()}>
              <ImageUpIcon className="size-4" />
              {poster ? "다른 이미지 올리기" : "이미지 파일 고르기"}
            </Button>
            {imageIdFromUrl(poster) ? (
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                className="min-h-11 gap-1.5 border-white/20 text-xs text-[#c9c0b2]"
                onClick={() => void analyze()}
              >
                <SparklesIcon className="size-4" />
                AI로 포스터 글자 읽기 (선택 · 유료)
              </Button>
            ) : null}
          </div>
          {posterNote ? <p className={noteClass(posterNote)}>{posterNote.text}</p> : null}
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
      </div>
      <div className="grid gap-2">
        <Label htmlFor="content" className="write-label">상세 내용</Label>
        <Textarea id="content" className="write-body-input" value={content} onChange={(e) => setContent(e.target.value)} />
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="button" size="touch" disabled={pending || busy} onClick={() => void submit()}>
        {pending ? "등록 중…" : "캘린더에 등록"}
      </Button>
    </div>
  );
}
