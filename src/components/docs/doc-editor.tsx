"use client";

import { useRef, useState } from "react";
import { EyeIcon, PencilLineIcon } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { DocDesk, DocSheet } from "@/components/docs/doc-sheet";
import { looksLikeHtml, textToDocHtml } from "@/lib/doc-html";
import { cn } from "cn";

/** 서식 버튼: 고른 글자를 태그로 감쌉니다. 고른 글자가 없으면 예시 글을 넣습니다. */
const FORMATS = [
  { label: "가운데 제목", open: "<h2>", close: "</h2>", sample: "제목" },
  { label: "밑줄 소제목", open: '<h3 class="doc-sub">', close: "</h3>", sample: "1. 소제목" },
  { label: "빨간 강조", open: '<span class="red">', close: "</span>", sample: "중요한 내용" },
  { label: "굵게", open: "<strong>", close: "</strong>", sample: "굵은 글" },
  { label: "밑줄", open: "<u>", close: "</u>", sample: "밑줄 글" },
  { label: "문단", open: "<p>", close: "</p>", sample: "문단 내용" },
  {
    label: "하단 푸터",
    open: "<footer>",
    close: "</footer>",
    sample: "<p>- 1 -</p><p>번역: 홍길동 · 검수: 김포카</p><p>Copyright © POKA. All rights reserved.</p>",
  },
] as const;

/**
 * 미리보기용 간이 정리(작성자 본인 화면에서만 씀). 실제 게시글은 서버에서 sanitize-html로 다시 거릅니다.
 * script·iframe 등과 on* 속성, javascript: 주소를 지웁니다.
 */
function previewSafe(html: string) {
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, "text/html");
  doc.querySelectorAll("script,style,iframe,object,embed,form,input,button,link,meta,svg,math").forEach((el) => el.remove());
  doc.querySelectorAll("*").forEach((el) => {
    for (const attr of Array.from(el.attributes)) {
      const bad = /^on/i.test(attr.name) || /^\s*(javascript|data|vbscript):/i.test(attr.value);
      if (bad) el.removeAttribute(attr.name);
    }
  });
  return doc.body.firstElementChild?.innerHTML ?? "";
}

/**
 * 종이 문서용 본문 편집기. 일반 글로 써도 되고(빈 줄=문단, "1."로 시작하는 줄=밑줄 소제목),
 * HTML 태그를 쓰면 그 서식이 종이 문서에 그대로 나옵니다. 미리보기로 종이 모양을 확인합니다.
 */
export function DocEditor({
  id,
  title,
  value,
  onChange,
  placeholder,
}: {
  id: string;
  title: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [preview, setPreview] = useState(false);

  function wrap(open: string, close: string, sample: string) {
    const el = ref.current;
    const start = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? value.length;
    const picked = value.slice(start, end) || sample;
    const next = value.slice(0, start) + open + picked + close + value.slice(end);
    onChange(next);
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(start + open.length, start + open.length + picked.length);
    });
  }

  const html = preview ? previewSafe(looksLikeHtml(value) ? value : textToDocHtml(value)) : "";

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-center gap-1.5" role="toolbar" aria-label="문서 서식">
        {FORMATS.map((f) => (
          <button
            key={f.label}
            type="button"
            disabled={preview}
            onClick={() => wrap(f.open, f.close, f.sample)}
            className={cn(
              "min-h-9 rounded-md border border-white/15 px-2.5 text-xs font-semibold text-[#E5E7EB] hover:border-[#c9a25c]/70 disabled:opacity-40",
              f.label === "빨간 강조" && "text-red-400",
              f.label === "밑줄 소제목" && "underline underline-offset-2",
            )}
          >
            {f.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setPreview((v) => !v)}
          className="ml-auto inline-flex min-h-9 items-center gap-1 rounded-md bg-[#c9a25c] px-3 text-xs font-bold text-[#1d1611] hover:bg-[#e7c98a]"
        >
          {preview ? <PencilLineIcon className="size-4" /> : <EyeIcon className="size-4" />}
          {preview ? "편집" : "종이 미리보기"}
        </button>
      </div>
      {preview ? (
        <DocDesk>
          <DocSheet title={title || "제목"} html={html} />
        </DocDesk>
      ) : (
        <Textarea
          ref={ref}
          id={id}
          className="write-body-input min-h-[50dvh] font-mono text-sm leading-7"
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
      <p className="text-xs text-[#9CA3AF]">
        일반 글로 써도 됩니다(빈 줄로 문단, &quot;1.&quot;·&quot;제3조&quot;로 시작하는 줄은 밑줄 소제목, 끝의 Copyright·번역·검수 줄은 하단 푸터).
        HTML 서식을 쓰면 그대로 종이에 나옵니다.
      </p>
    </div>
  );
}
