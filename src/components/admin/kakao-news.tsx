"use client";

import { useState } from "react";

/** 오픈채팅 소식 글: 미리보기 + 복사 */
export function KakaoNews({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }
  return (
    <details data-kakao-news className="rounded-2xl border border-[#fee500]/50 bg-[#fee500]/5 p-3 sm:p-4">
      <summary className="cursor-pointer text-base font-semibold">💬 오픈채팅 소식(주 1~2번)</summary>
      <p className="mt-2 text-xs text-muted-foreground">
        오늘 숫자로 자동으로 만든 글이에요. 공식 오픈채팅방에 주 1~2번만 올려 주세요(자주 올리면 홍보로 보여요). 링크로 들어온 방문은 유입 경로의 「카카오톡」 줄에 잡혀요.
      </p>
      <button
        type="button"
        data-kakao-copy
        onClick={() => void copy()}
        className={copied ? "mt-2 min-h-11 rounded-lg bg-emerald-500 px-4 text-sm font-bold text-black" : "mt-2 min-h-11 rounded-lg bg-[#fee500] px-4 text-sm font-bold text-[#1d1611]"}
      >
        {copied ? "✅ 복사됨" : "소식 글 복사"}
      </button>
      <pre className="mt-2 max-h-72 overflow-y-auto rounded-xl bg-black/40 p-3 font-sans text-[13px] leading-6 whitespace-pre-wrap text-[#ece4d6]">{text}</pre>
    </details>
  );
}
