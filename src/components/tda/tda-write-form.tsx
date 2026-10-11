"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileTextIcon, FileUpIcon, Loader2Icon, Trash2Icon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DocEditor } from "@/components/docs/doc-editor";
import { isRuleHeading } from "@/lib/tda";
import { PDF_MAX_BYTES } from "@/lib/uploads";

/** pdf.js 작업 파일. 패키지 버전(pdfjs-dist 4.10.38)과 같은 파일을 public/vendor에 둡니다. */
const PDF_WORKER_SRC = "/vendor/pdf.worker-4.10.38.min.mjs";

/**
 * PDF는 화면 폭에 맞춰 줄이 끊겨 나옵니다(단어 중간에서 끊기기도 함). 문단 안의 줄은 다시 이어 붙입니다.
 * 조항 머리줄·빈 줄·문장 끝(. ! ? :)에서는 줄을 유지하고, 그 밖의 줄은 한 칸 띄어 잇습니다.
 * 글자층만으로는 단어 중간에서 끊긴 줄인지 알 수 없어 늘 띄웁니다. 문서 보기 검색은 띄어쓰기를 무시하고 찾습니다.
 */
function joinWrappedLines(raw: string): string {
  const lines = raw.split("\n");
  let out = "";
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const next = lines[i + 1];
    out += line.trimEnd();
    if (next === undefined) break;
    const keepBreak =
      !line.trim() || !next.trim() || isRuleHeading(line) || isRuleHeading(next) || /[.!?:。)\]」]\s*$/.test(line);
    if (keepBreak) out += "\n";
    else out += " ";
  }
  return out.replace(/\n{3,}/g, "\n\n").trim();
}

/** PDF의 글자층을 쪽 순서대로 읽어 한 덩어리 글로 만듭니다. 스캔 이미지 PDF는 글자가 없어 읽지 못합니다. */
async function pdfToText(file: File): Promise<string> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = PDF_WORKER_SRC;
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  const pages: string[] = [];
  for (let n = 1; n <= doc.numPages; n += 1) {
    const page = await doc.getPage(n);
    const text = await page.getTextContent();
    let out = "";
    for (const item of text.items) {
      if (!("str" in item)) continue;
      out += item.str + (item.hasEOL ? "\n" : "");
    }
    pages.push(joinWrappedLines(out));
  }
  await doc.destroy();
  return pages.filter(Boolean).join("\n\n");
}

/**
 * TDA 룰 작성·수정.
 * - PDF 원본 그대로 올리기: 게시글에서 PDF 뷰어로 쪽마다 이어서 보여 줍니다(글자층이 있어 검색·Ctrl+F 가능).
 * - 글로 불러오기: 문서 파일(.txt, .md, .pdf)의 글자를 꺼내 본문으로 씁니다(종이 문서 모양).
 * 문서 보기에서 "1.", "제3조", "Rule 4"로 시작하는 줄은 조항 머리줄로 굵게 보입니다.
 */
export function TdaWriteForm({
  hint,
  postId,
  initial,
}: {
  hint: string;
  postId?: string;
  initial?: { title: string; content: string; pdfUrl?: string | null };
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const pdfRef = useRef<HTMLInputElement>(null);
  const [pdfUrl, setPdfUrl] = useState(initial?.pdfUrl ?? "");
  const [pdfName, setPdfName] = useState(initial?.pdfUrl ? "올려 둔 PDF" : "");
  const [progress, setProgress] = useState<string | null>(null);
  const [title, setTitle] = useState(initial?.title ?? "");
  const [content, setContent] = useState(initial?.content ?? "");
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function importFile(file: File | undefined) {
    if (!file) return;
    setLoading(true);
    setNote(null);
    try {
      const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
      if (isPdf) {
        // PDF는 글로 바꾸지 않고 원본 그대로 올립니다.
        setLoading(false);
        if (fileRef.current) fileRef.current.value = "";
        await uploadPdf(file);
        return;
      }
      const text = await file.text();
      if (!text.trim()) throw new Error("글자를 찾지 못했습니다. 스캔한 이미지 PDF는 글자를 읽을 수 없습니다.");
      setContent((prev) => (prev.trim() ? `${prev.trim()}\n\n${text.trim()}` : text.trim()));
      if (!title.trim()) setTitle(file.name.replace(/\.(pdf|txt|md)$/i, ""));
      setNote({ ok: true, text: `${file.name}에서 ${text.length.toLocaleString()}자를 불러왔습니다. 내용을 확인한 뒤 등록하세요.` });
    } catch (err) {
      setNote({ ok: false, text: err instanceof Error ? err.message : "파일을 읽지 못했습니다." });
    } finally {
      setLoading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  /** PDF 원본을 올립니다. 글자층은 검색용으로 본문에도 담아 둡니다(화면에는 PDF가 보임). */
  async function uploadPdf(file: File | undefined) {
    if (!file) return;
    setLoading(true);
    setNote(null);
    try {
      if (file.size > PDF_MAX_BYTES) throw new Error("PDF가 너무 큽니다(최대 30MB).");
      // 1) 파일 자리 만들기 → 2) 3MB 조각 올리기 → 3) 마치기
      const start = await fetch("/api/uploads/file", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ size: file.size, name: file.name }),
      });
      const slot = (await start.json()) as { id?: string; partSize?: number; parts?: number; error?: string };
      if (!start.ok || !slot.id || !slot.partSize || !slot.parts) throw new Error(slot.error ?? "PDF를 올리지 못했습니다.");
      for (let idx = 0; idx < slot.parts; idx += 1) {
        setProgress(`PDF 올리는 중 ${idx + 1}/${slot.parts}`);
        const chunk = file.slice(idx * slot.partSize, (idx + 1) * slot.partSize);
        const put = await fetch(`/api/uploads/file/${slot.id}/${idx}`, { method: "PUT", body: chunk });
        if (!put.ok) {
          const err = (await put.json().catch(() => ({}))) as { error?: string };
          throw new Error(err.error ?? "PDF 조각을 올리지 못했습니다.");
        }
      }
      const done = await fetch(`/api/uploads/file/${slot.id}/complete`, { method: "POST" });
      const payload = (await done.json()) as { url?: string; error?: string };
      if (!done.ok || !payload.url) throw new Error(payload.error ?? "PDF를 올리지 못했습니다.");
      setPdfUrl(payload.url);
      setPdfName(file.name);
      if (!title.trim()) setTitle(file.name.replace(/\.pdf$/i, ""));
      const text = await pdfToText(file).catch(() => "");
      setContent(text.trim());
      setNote({
        ok: true,
        text: text.trim()
          ? `${file.name}을(를) 올렸습니다. 게시글에서 PDF 그대로 보이고, 글자 ${text.length.toLocaleString()}자로 검색할 수 있습니다.`
          : `${file.name}을(를) 올렸습니다. 글자층이 없는 스캔 PDF라 검색은 되지 않습니다.`,
      });
    } catch (err) {
      setNote({ ok: false, text: err instanceof Error ? err.message : "PDF를 올리지 못했습니다." });
    } finally {
      setLoading(false);
      setProgress(null);
      if (pdfRef.current) pdfRef.current.value = "";
    }
  }

  async function submit() {
    setPending(true);
    setError(null);
    try {
      if (title.trim().length < 2) throw new Error("제목을 입력하세요.");
      if (!content.trim() && !pdfUrl) throw new Error("PDF를 올리거나 내용을 입력하세요.");
      const response = await fetch(postId ? `/api/posts/${postId}` : "/api/posts", {
        method: postId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ boardType: "TDA", title, content: content.trim() || title.trim(), docPdfUrl: pdfUrl || null }),
      });
      const payload = (await response.json()) as { id?: string; error?: string };
      if (!response.ok || !payload.id) throw new Error(payload.error ?? "저장에 실패했습니다.");
      router.replace(`/boards/tda#tda-${payload.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장에 실패했습니다.");
      setPending(false);
    }
  }

  async function remove() {
    if (!postId || !window.confirm("이 TDA 룰을 삭제할까요? 문서 보기에서 사라집니다.")) return;
    setPending(true);
    setError(null);
    const response = await fetch(`/api/posts/${postId}`, { method: "DELETE" });
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) {
      setError(payload.error ?? "삭제에 실패했습니다.");
      setPending(false);
      return;
    }
    router.replace("/boards/tda");
    router.refresh();
  }

  return (
    <div className="ink-panel flex flex-col gap-4 rounded-2xl p-4 sm:p-5">
      <p className="rounded-xl border border-primary/40 bg-primary/10 px-3 py-2 text-sm">{hint}</p>

      <section className="grid gap-2 rounded-xl border-2 border-[#FEE500] bg-[#FEE500]/[0.1] p-3" aria-label="PDF 원본 올리기">
        <p className="text-base font-black text-[#FEE500]">PDF 원본 그대로 올리기 (추천)</p>
        <p className="text-xs text-[#f3eccd]">
          PDF 파일 자체를 올리면 게시글에 PDF가 그대로 보입니다. 쪽마다 위에서 아래로 이어서 읽고, 위 검색창과 Ctrl+F로 PDF 속 단어를 찾을 수 있습니다. (최대 30MB)
        </p>
        <input
          ref={pdfRef}
          type="file"
          accept=".pdf,application/pdf"
          className="sr-only"
          onChange={(event) => void uploadPdf(event.target.files?.[0])}
        />
        {pdfUrl ? (
          <div className="flex items-center gap-2 rounded-lg border border-[#FEE500]/40 bg-[#141110] px-3 py-2 text-sm">
            <FileTextIcon className="size-5 shrink-0 text-[#FEE500]" />
            <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1 truncate font-semibold text-white underline">
              {pdfName || "PDF"}
            </a>
            <button
              type="button"
              aria-label="PDF 빼기"
              className="grid size-9 place-items-center rounded-md text-[#9CA3AF] hover:bg-white/10"
              onClick={() => {
                setPdfUrl("");
                setPdfName("");
              }}
            >
              <XIcon className="size-4" />
            </button>
          </div>
        ) : null}
        <Button
          type="button"
          disabled={loading}
          className="min-h-12 gap-1.5 bg-[#FEE500] font-black text-[#1d1611] hover:bg-[#ffeb3b]"
          onClick={() => pdfRef.current?.click()}
        >
          {loading ? <Loader2Icon className="size-4 animate-spin" /> : <FileUpIcon className="size-4" />}
          {loading ? (progress ?? "PDF 올리는 중…") : pdfUrl ? "다른 PDF로 바꾸기" : "PDF 파일 고르기"}
        </Button>
        {note ? (
          <p
            className={
              note.ok
                ? "rounded-lg bg-[#FEE500]/10 px-2.5 py-1.5 text-xs font-semibold text-[#FEE500]"
                : "rounded-lg bg-rose-500/10 px-2.5 py-1.5 text-xs font-semibold text-rose-300"
            }
          >
            {note.text}
          </p>
        ) : null}
      </section>

      {pdfUrl ? null : (
      <section className="grid gap-2 rounded-xl border border-white/15 bg-[#141110] p-3" aria-label="글로 불러오기">
        <p className="text-sm font-black text-[#e7c98a]">또는 글로 불러오기</p>
        <p className="text-xs text-[#f3eccd]">
          PDF·텍스트(.txt, .md) 파일을 고르면 글자를 꺼내 본문에 넣습니다. 쪽 넘김 없이 한 문서로 이어서 보입니다.
          &quot;1.&quot;, &quot;제3조&quot;, &quot;Rule 4&quot;로 시작하는 줄은 조항 제목으로 굵게 표시됩니다.
        </p>
        <input
          ref={fileRef}
          type="file"
          accept=".txt,.md,.pdf,text/plain,text/markdown,application/pdf"
          className="sr-only"
          onChange={(event) => void importFile(event.target.files?.[0])}
        />
        <Button type="button" variant="secondary" disabled={loading} className="min-h-11 gap-1.5" onClick={() => fileRef.current?.click()}>
          {loading ? <Loader2Icon className="size-4 animate-spin" /> : <FileUpIcon className="size-4" />}
          {loading ? "문서 읽는 중…" : "문서 파일에서 글 꺼내기"}
        </Button>
      </section>
      )}

      <div className="grid gap-2">
        <Label htmlFor="tda-title" className="write-label">
          제목
        </Label>
        <Input
          id="tda-title"
          className="write-title-input"
          value={title}
          placeholder="예: 1. 플로어 결정"
          onChange={(event) => setTitle(event.target.value)}
        />
      </div>
      {pdfUrl ? (
        <p className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-[#c9c0b2]">
          PDF를 올렸으므로 게시글에는 PDF 원본이 보입니다. 본문 입력은 필요 없습니다.
        </p>
      ) : (
      <div className="grid gap-2">
        <Label htmlFor="tda-content" className="write-label">
          내용 <span className="text-xs font-normal text-[#9CA3AF]">{content.length.toLocaleString()}자</span>
        </Label>
        <DocEditor
          id="tda-content"
          title={title}
          value={content}
          placeholder={"1. 플로어 결정\n플로어의 결정은 최종입니다…"}
          onChange={setContent}
        />
      </div>
      )}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button type="button" size="touch" className="flex-1" disabled={pending || loading} onClick={() => void submit()}>
          {pending ? "저장 중…" : postId ? "수정 저장" : "등록"}
        </Button>
        {postId ? (
          <Button
            type="button"
            size="touch"
            variant="outline"
            className="gap-1.5 border-rose-500/60 text-rose-300 hover:bg-rose-500/10"
            disabled={pending}
            onClick={() => void remove()}
          >
            <Trash2Icon className="size-4" />
            삭제
          </Button>
        ) : null}
      </div>
    </div>
  );
}
