"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AD_PRODUCTS } from "@/lib/sponsor";

export function AdvertiseForm() {
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

  if (done) {
    return (
      <p className="rounded-2xl border border-primary/30 bg-emerald-50 px-4 py-6 text-sm text-emerald-900">
        문의가 접수되었습니다. 영업일 기준 1~2일 안에 연락드립니다.
      </p>
    );
  }

  return (
    <form
      className="flex flex-col gap-3 rounded-2xl border border-border bg-white p-4 shadow-sm"
      onSubmit={(event) => {
        event.preventDefault();
        void submit(new FormData(event.currentTarget));
      }}
    >
      <div>
        <Label htmlFor="company">업체 · 브랜드</Label>
        <Input id="company" name="company" required className="mt-1 h-11" placeholder="예: DEALER FIT" />
      </div>
      <div>
        <Label htmlFor="contact">연락처 (이메일 또는 전화)</Label>
        <Input id="contact" name="contact" required className="mt-1 h-11" placeholder="hello@brand.com" />
      </div>
      <div>
        <Label htmlFor="product">희망 상품</Label>
        <select
          id="product"
          name="product"
          className="mt-1 h-11 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
          defaultValue={AD_PRODUCTS[0].name}
        >
          {AD_PRODUCTS.map((item) => (
            <option key={item.id} value={item.name}>
              {item.name} · {item.price}
            </option>
          ))}
        </select>
      </div>
      <div>
        <Label htmlFor="message">요청 내용</Label>
        <Textarea
          id="message"
          name="message"
          required
          minLength={8}
          className="mt-1 min-h-28"
          placeholder="희망 기간, 소재(300×150 이미지 등), 랜딩 URL을 적어 주세요."
        />
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" size="touch" disabled={pending}>
        {pending ? "보내는 중…" : "제휴 문의 보내기"}
      </Button>
    </form>
  );
}
