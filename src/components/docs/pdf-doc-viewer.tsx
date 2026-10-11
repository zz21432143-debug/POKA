"use client";

import { useEffect, useRef, useState } from "react";
import { DownloadIcon, Loader2Icon } from "lucide-react";

/** pdf.js 파일 위치. 패키지 버전(pdfjs-dist 4.10.38)과 같은 파일을 public/vendor에 둡니다. */
const PDFJS_BASE = "/vendor/pdfjs-4.10.38";
const PDF_WORKER_SRC = "/vendor/pdf.worker-4.10.38.min.mjs";

type Status = { kind: "loading"; done: number; total: number } | { kind: "ready"; total: number } | { kind: "error"; message: string };

/**
 * PDF 원본을 쪽 넘김 없이 위에서 아래로 이어서 보여 줍니다.
 * 쪽마다 그림(canvas)은 화면 가까이 올 때 그리고, 글자층(textLayer)은 처음에 모두 깔아
 * 브라우저 Ctrl+F와 위 검색창(.textLayer 안의 글자를 칠함)이 PDF 속 글자를 찾을 수 있게 합니다.
 */
export function PdfDocViewer({ url, title }: { url: string; title: string }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<Status>({ kind: "loading", done: 0, total: 0 });

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let cancelled = false;
    let destroy: (() => void) | null = null;

    (async () => {
      const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
      pdfjs.GlobalWorkerOptions.workerSrc = PDF_WORKER_SRC;
      const task = pdfjs.getDocument({
        url,
        cMapUrl: `${PDFJS_BASE}/cmaps/`,
        cMapPacked: true,
        standardFontDataUrl: `${PDFJS_BASE}/standard_fonts/`,
      });
      const doc = await task.promise;
      if (cancelled) {
        void doc.destroy();
        return;
      }
      const total = doc.numPages;
      setStatus({ kind: "loading", done: 0, total });

      const pages: { wrap: HTMLDivElement; canvas: HTMLCanvasElement; baseWidth: number; drawnWidth: number; num: number }[] = [];
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      const draw = async (entry: (typeof pages)[number]) => {
        const width = entry.wrap.clientWidth;
        if (!width || entry.drawnWidth >= width * 0.95) return;
        entry.drawnWidth = width;
        const page = await doc.getPage(entry.num);
        const scale = Math.min((width * dpr) / entry.baseWidth, 4);
        const viewport = page.getViewport({ scale });
        entry.canvas.width = Math.floor(viewport.width);
        entry.canvas.height = Math.floor(viewport.height);
        const ctx = entry.canvas.getContext("2d");
        if (ctx) await page.render({ canvasContext: ctx, viewport }).promise.catch(() => undefined);
      };

      // 화면 가까이 온 쪽만 그립니다.
      const io = new IntersectionObserver(
        (entries) => {
          for (const e of entries) {
            if (!e.isIntersecting) continue;
            const entry = pages.find((p) => p.wrap === e.target);
            if (entry) void draw(entry);
          }
        },
        { rootMargin: "800px 0px" },
      );
      // 폭이 바뀌면 글자층 비율(--scale-factor)을 맞추고, 더 넓어졌으면 다시 그립니다.
      const ro = new ResizeObserver(() => {
        for (const p of pages) {
          p.wrap.style.setProperty("--scale-factor", String(p.wrap.clientWidth / p.baseWidth));
          if (p.wrap.clientWidth > p.drawnWidth * 1.3 && p.drawnWidth > 0) void draw(p);
        }
      });
      destroy = () => {
        io.disconnect();
        ro.disconnect();
        void doc.destroy();
      };

      for (let num = 1; num <= total; num += 1) {
        if (cancelled) return;
        const page = await doc.getPage(num);
        const base = page.getViewport({ scale: 1 });
        const wrap = document.createElement("div");
        wrap.className = "pdf-page";
        wrap.style.aspectRatio = `${base.width} / ${base.height}`;
        wrap.dataset.page = String(num);
        const canvas = document.createElement("canvas");
        canvas.className = "pdf-canvas";
        canvas.setAttribute("aria-hidden", "true");
        const text = document.createElement("div");
        text.className = "textLayer";
        const label = document.createElement("span");
        label.className = "pdf-pageno";
        label.textContent = `${num} / ${total}`;
        label.setAttribute("aria-hidden", "true");
        wrap.append(canvas, text, label);
        host.append(wrap);
        wrap.style.setProperty("--scale-factor", String(wrap.clientWidth / base.width));
        const entry = { wrap, canvas, baseWidth: base.width, drawnWidth: 0, num };
        pages.push(entry);
        io.observe(wrap);
        ro.observe(wrap);
        // 글자층: 배율 1 기준으로 깔고 --scale-factor로 화면 폭에 맞춥니다.
        await new pdfjs.TextLayer({ textContentSource: page.streamTextContent(), container: text, viewport: base })
          .render()
          .catch(() => undefined);
        if (!cancelled) setStatus({ kind: "loading", done: num, total });
      }
      if (!cancelled) setStatus({ kind: "ready", total });
    })().catch((err: unknown) => {
      if (!cancelled) setStatus({ kind: "error", message: err instanceof Error ? err.message : "PDF를 열지 못했습니다." });
    });

    return () => {
      cancelled = true;
      destroy?.();
      host.replaceChildren();
    };
  }, [url]);

  return (
    <div className="pdf-doc">
      <div className="pdf-doc-bar">
        <span className="truncate">{title}</span>
        <span className="shrink-0 text-xs text-[#9CA3AF]">
          {status.kind === "loading"
            ? status.total
              ? `불러오는 중 ${status.done}/${status.total}쪽`
              : "PDF 여는 중…"
            : status.kind === "ready"
              ? `${status.total}쪽`
              : ""}
        </span>
        <a href={url} target="_blank" rel="noopener noreferrer" className="pdf-doc-download" aria-label="PDF 원본 열기">
          <DownloadIcon className="size-4" />
          원본
        </a>
      </div>
      {status.kind === "loading" && status.done === 0 ? (
        <p className="flex items-center justify-center gap-2 py-16 text-sm text-[#c9c0b2]">
          <Loader2Icon className="size-5 animate-spin" />
          PDF를 여는 중입니다…
        </p>
      ) : null}
      {status.kind === "error" ? (
        <p className="py-12 text-center text-sm text-rose-300">
          PDF를 보여 주지 못했습니다. <a href={url} className="underline">원본 열기</a>
        </p>
      ) : null}
      {/* pdf.js가 쪽(그림 + 글자층)을 이 안에 직접 그립니다. React는 이 안을 건드리지 않습니다. */}
      <div ref={hostRef} className="pdf-pages" data-pdf-pages />
    </div>
  );
}
