"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { POST_EXP } from "@/lib/rewards";

export function ScheduleForm({ hint }: { hint: string }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [venue, setVenue] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [prize, setPrize] = useState("");
  const [poster, setPoster] = useState("");
  const [link, setLink] = useState("");
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit() {
    setPending(true);
    setError(null);
    try {
      if (title.trim().length < 2) throw new Error("대회명을 입력하세요.");
      if (!start) throw new Error("시작일을 선택하세요.");
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
        {hint} · 작성 EXP +{POST_EXP.SCHEDULE}
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-2 sm:col-span-2">
          <Label htmlFor="name">대회명</Label>
          <Input
            id="name"
            className="h-11"
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
          <Input id="start" type="date" className="h-11 text-base" value={start} onChange={(e) => setStart(e.target.value)} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="end">종료일</Label>
          <Input id="end" type="date" className="h-11 text-base" value={end} onChange={(e) => setEnd(e.target.value)} />
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
            placeholder="/banners/slot-3.svg"
            onChange={(e) => setPoster(e.target.value)}
          />
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="content">상세</Label>
        <Textarea id="content" className="min-h-28" value={content} onChange={(e) => setContent(e.target.value)} />
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="button" size="touch" disabled={pending} onClick={() => void submit()}>
        {pending ? "등록 중…" : "일정 등록"}
      </Button>
    </div>
  );
}
