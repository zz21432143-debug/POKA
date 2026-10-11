"use client";

import { useEffect, useRef, useState } from "react";
import { DownloadIcon, Loader2Icon } from "lucide-react";

/** pdf.js 파일 위치. 패키지 버전(pdfjs-dist 4.10.38)과 같은 파일을 public/vendor에 둡니다. */
const PDFJS_BASE = "/vendor/pdfjs-4.10.38";
const PDF_WORKER_SRC = "/vendor/pdf.worker-4.10.38.min.mjs";

type Status =
  | { kind: "downloading"; done: number; total: number }
  | { kind: "loading"; done: number; total: number }
  | { kind: "ready"; total: number }
  | { kind: "error"; message: string };

/**
 * PDF 원본 바이트를 받아 옵니다. 큰 PDF는 3MB 조각(/api/files/{id}/{n})으로 나눠 받아 합칩니다.
 * 이 사이트 파일 주소가 아니면 주소에서 그대로 받습니다.
 */
async function fetchPdfBytes(url: string, onProgress: (done: number, total: number) => void): Promise<Uint8Array> {
  const m = url.match(/^\/api\/files\/([a-z0-9]+)$/i);
  if (!m) return new Uint8Array(await (await fetch(url)).arrayBuffer());
  const meta = (await (await fetch(`${url}/meta`)).json()) as { size: number; parts: number };
  const out = new Uint8Array(meta.size);
  let done = 0;
  onProgress(0, meta.parts);
  let offset = 0;
  const parts = await Promise.all(
    Array.from({ length: meta.parts }, async (_, idx) => {
      const response = await fetch(`${url}/${idx}`);
      if (!response.ok) throw new Error("PDF 조각을 받지 못했습니다.");
      const buf = new Uint8Array(await response.arrayBuffer());
      done += 1;
      onProgress(done, meta.parts);
      return buf;
    }),
  );
  for (const part of parts) {
    out.set(part, offset);
    offset += part.byteLength;
  }
  return out;
}

/**
 * PDF 원본을 쪽 넘김 없이 위에서 아래로 이어서 보여 줍니다.
 * 쪽마다 그림(canvas)은 화면 가까이 올 때 그리고, 글자층(textLayer)은 처음에 모두 깔아
 * 브라우저 Ctrl+F와 위 검색창(.textLayer 안의 글자를 칠함)이 PDF 속 글자를 찾을 수 있게 합니다.
 */
export function PdfDocViewer({ url, title }: { url: string; title: string }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<Status>({ kind: "downloading", done: 0, total: 0 });
  // "원본" 버튼: 받은 바이트로 만든 PDF 주소(조각으로 받은 큰 파일도 브라우저 PDF 보기로 열림)
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let cancelled = false;
    let destroy: (() => void) | null = null;

    let objectUrl: string | null = null;

    (async () => {
      const [pdfjs, bytes] = await Promise.all([
        import("pdfjs-dist/legacy/build/pdf.mjs"),
        fetchPdfBytes(url, (done, total) => {
          if (!cancelled) setStatus({ kind: "downloading", done, total });
        }),
      ]);
      if (cancelled) return;
      objectUrl = URL.createObjectURL(new Blob([bytes.slice()], { type: "application/pdf" }));
      setBlobUrl(objectUrl);
      pdfjs.GlobalWorkerOptions.workerSrc = PDF_WORKER_SRC;
      const task = pdfjs.getDocument({
        data: bytes,
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
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [url]);

  return (
    <div className="pdf-doc">
      <div className="pdf-doc-bar">
        <span className="truncate">{title}</span>
        <span className="shrink-0 text-xs text-[#9CA3AF]">
          {status.kind === "downloading"
            ? status.total > 1
              ? `받는 중 ${status.done}/${status.total}`
              : "PDF 받는 중…"
            : status.kind === "loading"
              ? status.total
                ? `불러오는 중 ${status.done}/${status.total}쪽`
                : "PDF 여는 중…"
              : status.kind === "ready"
                ? `${status.total}쪽`
                : ""}
        </span>
        <a
          href={blobUrl ?? url}
          target="_blank"
          rel="noopener noreferrer"
          download={`${title}.pdf`}
          className="pdf-doc-download"
          aria-label="PDF 원본 내려받기"
        >
          <DownloadIcon className="size-4" />
          원본
        </a>
      </div>
      {status.kind === "downloading" || (status.kind === "loading" && status.done === 0) ? (
        <p className="flex items-center justify-center gap-2 py-16 text-sm text-[#c9c0b2]">
          <Loader2Icon className="size-5 animate-spin" />
          PDF를 여는 중입니다…
        </p>
      ) : null}
      {status.kind === "error" ? (
        <p className="py-12 text-center text-sm text-rose-300">
          PDF를 보여 주지 못했습니다. ({status.message})
        </p>
      ) : null}
      {/* pdf.js가 쪽(그림 + 글자층)을 이 안에 직접 그립니다. React는 이 안을 건드리지 않습니다. */}
      <div ref={hostRef} className="pdf-pages" data-pdf-pages />
    </div>
  );
}
