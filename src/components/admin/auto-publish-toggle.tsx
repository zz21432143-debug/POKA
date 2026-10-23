"use client";

import { useState } from "react";
import { cn } from "cn";

/** 콘텐츠 자동 발행 켜기 · 끄기(매일 12:05 · 21:05, 그날 요일 계획 글 하나씩) */
export function AutoPublishToggle({ initialOn }: { initialOn: boolean }) {
  const [on, setOn] = useState(initialOn);
  const [busy, setBusy] = useState(false);
  async function toggle() {
    setBusy(true);
    const res = await fetch("/api/admin/content-auto", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ on: !on }) }).catch(() => null);
    if (res?.ok) setOn(!on);
    setBusy(false);
  }
  return (
    <section data-auto-publish={on ? "on" : "off"} className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-[#151213] p-3 text-sm">
      <span className="min-w-0 flex-1">
        <b className={on ? "text-emerald-300" : "text-zinc-300"}>{on ? "🤖 자동 발행 켜짐" : "자동 발행 꺼짐"}</b>
        <span className="block text-xs text-muted-foreground">
          매일 낮 12시 · 밤 9시(5분쯤 뒤)에 그날 요일 계획 글 하나씩 POKA 계정으로 올려요. 사진 · 직접 그리는 핸드 · 〔 〕가 남은 글 · 「빼기」한 글은 건너뛰어요.
        </span>
      </span>
      <button
        type="button"
        disabled={busy}
        onClick={() => void toggle()}
        className={cn("min-h-10 rounded-lg px-4 font-bold disabled:opacity-50", on ? "border border-border" : "bg-emerald-500 text-black")}
      >
        {on ? "끄기" : "켜기"}
      </button>
    </section>
  );
}
