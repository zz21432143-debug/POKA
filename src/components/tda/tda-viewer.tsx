"use client";

import { useRef, useState } from "react";
import Link from "@/components/ui/link";
import { ChevronDownIcon, ChevronUpIcon, ListIcon, PencilIcon, SearchIcon, XIcon } from "lucide-react";
import { DocDesk, DocSheet } from "@/components/docs/doc-sheet";
import { PdfDocViewer } from "@/components/docs/pdf-doc-viewer";
import { DeletePostButton } from "@/components/posts/post-manage-bar";
import { TdaClearButton } from "@/components/tda/tda-clear-button";
import { findMatches } from "@/lib/tda";
import { loginHref } from "@/lib/login-path";
import { cn } from "cn";

/** html: 서버에서 거른 문서 HTML(제목·날짜 포함). 검색 칠하기가 제목까지 닿도록 한 덩어리로 받습니다. */
export type TdaDocSection = { id: string; title: string; html: string; /** PDF 원본(로그인 회원에게만 내려옴) */ pdfUrl?: string | null };

/** 문서 본문(서식 HTML) 안의 글자 조각마다 검색어를 찾아 <mark>로 감쌉니다. 찾은 개수를 돌려줍니다. */
function highlight(bodies: HTMLElement[], term: string): number {
  for (const body of bodies) {
    body.querySelectorAll("mark[data-hit]").forEach((mark) => mark.replaceWith(document.createTextNode(mark.textContent ?? "")));
    body.normalize();
  }
  if (!term) return 0;
  let hit = 0;
  for (const body of bodies) {
    const walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT);
    const nodes: Text[] = [];
    for (let node = walker.nextNode(); node; node = walker.nextNode()) nodes.push(node as Text);
    for (const node of nodes) {
      const text = node.data;
      const matches = findMatches(text, term);
      if (matches.length === 0) continue;
      const frag = document.createDocumentFragment();
      let last = 0;
      for (const m of matches) {
        if (m.start > last) frag.append(text.slice(last, m.start));
        const mark = document.createElement("mark");
        mark.dataset.hit = String(hit++);
        mark.textContent = text.slice(m.start, m.end);
        frag.append(mark);
        last = m.end;
      }
      if (last < text.length) frag.append(text.slice(last));
      node.replaceWith(frag);
    }
  }
  return hit;
}

/**
 * TDA 룰 문서 보기. 조항(글)마다 A4 종이 한 장씩, 쪽 넘김 없이 세로로 이어 붙여 스크롤로 읽습니다.
 * 본문 글자는 그대로 화면(DOM)에 있어 브라우저 Ctrl+F도 찾고, 위 검색창은 일치하는 곳을 칠하고 그 자리로 스크롤합니다.
 */
export function TdaViewer({
  sections,
  loggedIn,
  canManage,
}: {
  sections: TdaDocSection[];
  loggedIn: boolean;
  canManage: boolean;
}) {
  const [query, setQuery] = useState("");
  const [total, setTotal] = useState(0);
  const [active, setActive] = useState(0);
  const [tocOpen, setTocOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // 검색 대상: 종이 문서 본문 + PDF 글자층
  const bodies = () => Array.from(rootRef.current?.querySelectorAll<HTMLElement>("[data-doc-body], .textLayer") ?? []);

  function focusHit(index: number) {
    const root = rootRef.current;
    if (!root) return;
    root.querySelectorAll("mark.is-current").forEach((m) => m.classList.remove("is-current"));
    const el = root.querySelector<HTMLElement>(`mark[data-hit="${index}"]`);
    if (!el) return;
    el.classList.add("is-current");
    el.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function search(next: string) {
    setQuery(next);
    const count = highlight(bodies(), next.trim());
    setTotal(count);
    setActive(0);
    if (count > 0) focusHit(0);
  }

  function move(delta: number) {
    if (total === 0) return;
    const next = (active + delta + total) % total;
    setActive(next);
    focusHit(next);
  }

  const term = query.trim();

  return (
    <div ref={rootRef} className="flex flex-col gap-3">
      <div className="sticky top-[6.25rem] z-30 -mx-1 rounded-xl border border-[#c9a25c]/50 bg-[#1d1611]/95 p-2 shadow-[0_8px_20px_rgb(0_0_0/0.45)] backdrop-blur xl:top-[7.25rem]">
        <div className="flex items-center gap-1.5">
          <label className="relative flex-1">
            <span className="sr-only">TDA 룰에서 찾기</span>
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#9CA3AF]" />
            <input
              type="search"
              value={query}
              placeholder="단어 찾기 (예: 올인, 미스딜, 플로어)"
              className="h-11 w-full rounded-lg border border-white/15 bg-[#141110] pl-9 pr-3 text-base text-white placeholder:text-[#6b6460] focus:border-[#c9a25c] focus:outline-none"
              onChange={(event) => search(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  move(event.shiftKey ? -1 : 1);
                }
                if (event.key === "Escape") search("");
              }}
            />
          </label>
          <span className="min-w-14 text-center text-xs font-semibold text-[#c9c0b2]" aria-live="polite">
            {term ? (total > 0 ? `${active + 1} / ${total}` : "0건") : ""}
          </span>
          <button
            type="button"
            aria-label="이전 찾기"
            disabled={total === 0}
            onClick={() => move(-1)}
            className="grid size-10 place-items-center rounded-lg text-[#e7c98a] hover:bg-white/10 disabled:opacity-30"
          >
            <ChevronUpIcon className="size-5" />
          </button>
          <button
            type="button"
            aria-label="다음 찾기"
            disabled={total === 0}
            onClick={() => move(1)}
            className="grid size-10 place-items-center rounded-lg text-[#e7c98a] hover:bg-white/10 disabled:opacity-30"
          >
            <ChevronDownIcon className="size-5" />
          </button>
          {term ? (
            <button
              type="button"
              aria-label="검색 지우기"
              onClick={() => search("")}
              className="grid size-10 place-items-center rounded-lg text-[#9CA3AF] hover:bg-white/10"
            >
              <XIcon className="size-4" />
            </button>
          ) : null}
          <button
            type="button"
            aria-label="목차"
            aria-expanded={tocOpen}
            onClick={() => setTocOpen((v) => !v)}
            className={cn(
              "grid size-10 place-items-center rounded-lg hover:bg-white/10",
              tocOpen ? "bg-[#c9a25c] text-[#1d1611]" : "text-[#e7c98a]",
            )}
          >
            <ListIcon className="size-5" />
          </button>
        </div>
        {tocOpen ? (
          <nav aria-label="목차" className="mt-2 max-h-60 overflow-y-auto border-t border-white/10 pt-2">
            <ol className="grid gap-0.5">
              {sections.map((s, index) => (
                <li key={s.id}>
                  <a
                    href={`#tda-${s.id}`}
                    onClick={() => setTocOpen(false)}
                    className="flex gap-2 rounded-md px-2 py-1.5 text-sm text-[#E5E7EB] hover:bg-white/10"
                  >
                    <span className="w-6 shrink-0 text-right text-[#9CA3AF]">{index + 1}</span>
                    {s.title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        ) : null}
      </div>

      {canManage ? (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
          <span className="mr-auto text-xs font-semibold text-[#9CA3AF]">관리 · 문서마다 수정·삭제 버튼이 있습니다</span>
          <TdaClearButton count={sections.length} />
        </div>
      ) : null}

      {!loggedIn ? (
        <p className="ink-panel rounded-xl px-4 py-3 text-sm text-[#c9c0b2]">
          조항 제목만 보입니다. 본문 전체 · PDF 다운로드는{" "}
          <Link href={loginHref("/boards/tda")} className="font-bold text-[#e7c98a] underline">
            로그인
          </Link>{" "}
          후 읽을 수 있습니다.
        </p>
      ) : null}

      {sections.length === 0 ? (
        <p className="ink-panel rounded-xl px-4 py-10 text-center text-sm text-[#D1D5DB]">아직 올라온 TDA 룰이 없습니다.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {sections.map((s, index) =>
            s.pdfUrl ? (
              // PDF 원본을 올린 조항: 쪽마다 이어지는 PDF 뷰어
              <section key={s.id} id={`tda-${s.id}`} className="scroll-mt-40" aria-label={s.title}>
                {canManage ? (
                  <div className="mb-2 flex justify-end gap-2">
                    <Link
                      href={`/posts/${s.id}/edit`}
                      className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-[#c9a25c]/70 bg-[#c9a25c]/15 px-3 text-sm font-bold text-[#f3dca6] hover:bg-[#c9a25c]/25"
                    >
                      <PencilIcon className="size-4" />
                      수정
                    </Link>
                    <DeletePostButton postId={s.id} />
                  </div>
                ) : null}
                {loggedIn ? (
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <a
                      href={s.pdfUrl}
                      download={`${s.title.replace(/[\\/:*?"<>|]/g, " ").trim() || "TDA 룰"}.pdf`}
                      data-tda-download
                      className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border-2 border-[#5aa9ff] bg-[#123a66] px-4 text-sm font-black text-white hover:bg-[#1a4a80]"
                    >
                      ⬇ PDF 다운로드
                    </a>
                    <a
                      href={s.pdfUrl}
                      target="_blank"
                      rel="noopener"
                      className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-white/20 px-3 text-sm font-bold text-[#d6e8ff] hover:bg-white/10"
                    >
                      새 창으로 열기(인쇄)
                    </a>
                  </div>
                ) : null}
                <PdfDocViewer url={s.pdfUrl} title={s.title} />
              </section>
            ) : (
              <DocDesk key={s.id}>
                <DocSheet
                  id={`tda-${s.id}`}
                  html={s.html}
                  pageLabel={`- ${index + 1} / ${sections.length} -`}
                  actions={
                    canManage ? (
                      <>
                        <button
                          type="button"
                          onClick={() => window.print()}
                          className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-black/15 bg-white px-2.5 text-xs font-bold text-[#333] shadow-sm hover:bg-black/5"
                        >
                          🖨 인쇄 · PDF로 저장
                        </button>
                        <Link
                          href={`/posts/${s.id}/edit`}
                          className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-black/15 bg-white px-2.5 text-xs font-bold text-[#333] shadow-sm hover:bg-black/5"
                        >
                          <PencilIcon className="size-3.5" />
                          수정
                        </Link>
                        <DeletePostButton postId={s.id} tone="paper" className="min-h-9 px-2.5 text-xs" />
                      </>
                    ) : loggedIn ? (
                      <button
                        type="button"
                        data-tda-print
                        onClick={() => window.print()}
                        className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-black/15 bg-white px-2.5 text-xs font-bold text-[#333] shadow-sm hover:bg-black/5"
                      >
                        🖨 인쇄 · PDF로 저장
                      </button>
                    ) : undefined
                  }
                />
              </DocDesk>
            ),
          )}
        </div>
      )}
    </div>
  );
}
