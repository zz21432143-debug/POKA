"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { POST_EXP } from "@/lib/rewards";

export function OfficialPromoForm({ hint }: { hint: string }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [store, setStore] = useState("");
  const [location, setLocation] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [bannerSlot, setBannerSlot] = useState("");
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit() {
    setPending(true);
    setError(null);
    try {
      if (title.trim().length < 2) throw new Error("홍보 제목을 입력하세요.");
      const response = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          boardType: "PROMO",
          title,
          content,
          promoLocation: location,
          promoTag: store || "검증 매장",
          bannerImageUrl: imageUrl || "/banners/slot-1.svg",
          bannerSlot: bannerSlot ? Number(bannerSlot) : null,
          storeVerified: true,
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
        {hint} · 작성 EXP +{POST_EXP.PROMO}
      </p>
      <p className="text-sm text-muted-foreground">
        일반 대회 안내는 「대회 스케줄」로 올립니다. 이곳은 검증 매장 공식 홍보물만
        받습니다. 배너 구좌를 지정하면 메인 3×2 프리미엄 영역에 연결됩니다.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-2 sm:col-span-2">
          <Label htmlFor="title">홍보 제목</Label>
          <Input id="title" className="h-11" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="store">검증 매장명</Label>
          <Input id="store" className="h-11" value={store} placeholder="POKA 펍" onChange={(e) => setStore(e.target.value)} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="loc">지역</Label>
          <Input id="loc" className="h-11" value={location} placeholder="서울 강남" onChange={(e) => setLocation(e.target.value)} />
        </div>
        <div className="grid gap-2 sm:col-span-2">
          <Label htmlFor="img">공식 홍보물 이미지 URL</Label>
          <Input
            id="img"
            className="h-11"
            value={imageUrl}
            placeholder="/banners/slot-1.svg"
            onChange={(e) => setImageUrl(e.target.value)}
          />
        </div>
        <div className="grid gap-2 sm:col-span-2">
          <Label htmlFor="slot">프리미엄 배너 구좌 (1~6, 비우면 갤러리만)</Label>
          <Input
            id="slot"
            className="h-11"
            inputMode="numeric"
            value={bannerSlot}
            placeholder="예: 1"
            onChange={(e) => setBannerSlot(e.target.value)}
          />
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="content">상세</Label>
        <Textarea id="content" className="min-h-32" value={content} onChange={(e) => setContent(e.target.value)} />
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="button" size="touch" disabled={pending} onClick={() => void submit()}>
        {pending ? "등록 중…" : "공식 홍보 등록"}
      </Button>
    </div>
  );
}
