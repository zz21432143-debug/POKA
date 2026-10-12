"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AD_PRODUCTS } from "@/lib/sponsor";

export function AdvertiseForm({ loggedIn = true }: { loggedIn?: boolean }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit(form: FormData) {
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/advertise", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company: form.get("company"),
          contact: form.get("contact"),
          product: form.get("product"),
          message: form.get("message"),
        }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "문의가 접수되지 않았습니다.");
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "문의가 접수되지 않았습니다.");
    } finally {
      setPending(false);
    }
  }

  if (!loggedIn) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-[#1a1617] px-4 py-8 text-center">
        <p className="text-[15px] font-semibold text-white">문의는 로그인한 회원만 보낼 수 있습니다.</p>
        <p className="text-sm text-[#9CA3AF]">카카오 또는 구글로 10초 만에 가입할 수 있어요.</p>
        <a
          href={`/login?next=${encodeURIComponent("/advertise#inquiry")}`}
          className="inline-flex min-h-12 items-center rounded-full bg-[#8b2222] px-6 text-sm font-bold text-white hover:bg-[#a12a2a]"
        >
          로그인하고 문의하기
        </a>
      </div>
    );
  }

  if (done) {
    return (
      <p className="rounded-2xl border border-primary/30 bg-emerald-950/40 px-4 py-6 text-sm text-emerald-300">
        문의가 접수되었습니다. 남겨 주신 연락처로 1~2일 안에 연락드립니다.
      </p>
    );
  }

  return (
    <form
      className="flex flex-col gap-3 rounded-2xl border border-border bg-[#1a1617] p-4 shadow-sm"
      onSubmit={(event) => {
        event.preventDefault();
        void submit(new FormData(event.currentTarget));
      }}
    >
      <div>
        <Label htmlFor="company">업체 · 매장 · 대회명</Label>
        <Input id="company" name="company" required className="mt-1 h-11" placeholder="예: POKA홀덤 강남점" />
      </div>
      <div>
        <Label htmlFor="contact">연락처 (전화 · 이메일 · 카카오톡 ID)</Label>
        <Input id="contact" name="contact" required className="mt-1 h-11" placeholder="010-0000-0000" />
      </div>
      <div>
        <Label htmlFor="product">원하는 광고</Label>
        <select
          id="product"
          name="product"
          className="mt-1 h-11 w-full rounded-lg border border-[#3a332c] bg-[#1A1817] px-2.5 text-sm text-white"
          defaultValue="상담 후 결정"
        >
          <option value="상담 후 결정">상담 후 결정</option>
          {AD_PRODUCTS.map((item) => (
            <option key={item.id} value={item.name}>
              {item.code} · {item.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <Label htmlFor="message">문의 내용</Label>
        <Textarea
          id="message"
          name="message"
          required
          minLength={8}
          className="mt-1 min-h-28"
          placeholder="희망 기간, 알리고 싶은 내용(대회·오픈·이벤트), 연결할 링크를 적어 주세요."
        />
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" size="touch" disabled={pending}>
        {pending ? "보내는 중…" : "광고 문의 보내기"}
      </Button>
    </form>
  );
}
