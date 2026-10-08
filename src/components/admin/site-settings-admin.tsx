"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { PublicSiteSettings } from "@/lib/site-settings";

export function SiteSettingsAdmin({ initial }: { initial: PublicSiteSettings }) {
  const router = useRouter();
  const [noticeBanner, setNoticeBanner] = useState(initial.noticeBanner ?? "");
  const [footerEmail, setFooterEmail] = useState(initial.footerEmail);
  const [kakaoChannelUrl, setKakaoChannelUrl] = useState(initial.kakaoChannelUrl ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function save() {
    setPending(true);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/site-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ noticeBanner, footerEmail, kakaoChannelUrl }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "저장에 실패했습니다.");
      setMessage("저장했습니다. 상단 배너와 푸터에 바로 반영됩니다.");
      router.refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "저장에 실패했습니다.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex max-w-xl flex-col gap-4 rounded-xl border border-border bg-card p-4">
      <div className="grid gap-2">
        <Label htmlFor="notice-banner">상단 공지 배너</Label>
        <Textarea
          id="notice-banner"
          value={noticeBanner}
          onChange={(event) => setNoticeBanner(event.target.value)}
          placeholder="비우면 배너를 숨깁니다."
          className="min-h-20"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="footer-email">푸터 문의 이메일</Label>
        <Input
          id="footer-email"
          type="email"
          value={footerEmail}
          onChange={(event) => setFooterEmail(event.target.value)}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="kakao-url">카카오톡 1:1 문의 (아이디 POKA1)</Label>
        <Input
          id="kakao-url"
          value={kakaoChannelUrl}
          onChange={(event) => setKakaoChannelUrl(event.target.value)}
          placeholder="비우면 카카오톡 아이디 POKA1로 친구 추가"
        />
        <p className="text-xs text-muted-foreground">헤더 공식 오픈채팅은 그대로 두고, 하단 1:1만 이 주소/아이디를 씁니다.</p>
      </div>
      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
      <Button type="button" size="touch" disabled={pending} onClick={() => void save()}>
        {pending ? "저장 중…" : "설정 저장"}
      </Button>
    </div>
  );
}
