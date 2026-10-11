"use client";

import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { ChevronDownIcon, ChevronUpIcon, ListIcon, PencilIcon, SearchIcon, XIcon } from "lucide-react";
import { findMatches, isRuleHeading, type TdaSection } from "@/lib/tda";
import { loginHref } from "@/lib/login-path";
import { cn } from "cn";

/**
 * TDA 룰 문서 보기. 쪽 넘김 없이 모든 조항을 한 화면에 이어 붙여 스크롤로 읽습니다.
 * 글자는 그대로 화면(DOM)에 있으므로 브라우저 Ctrl+F도 그대로 찾습니다.
 * 위 검색창은 일치하는 곳을 노랗게 칠하고, 현재 위치(주황)로 스크롤합니다.
 */
export function TdaViewer({
  sections,
  loggedIn,
  canManage,
}: {
  sections: TdaSection[];
  loggedIn: boolean;
  canManage: boolean;
}) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [tocOpen, setTocOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const term = query.trim();
  // 제목·본문 전체에서 일치 개수. 화면에 칠하는 순서와 같은 순서로 셉니다.
  const total = useMemo(
    () =>
      term
        ? sections.reduce(
            (sum, s) =>
              sum +
              findMatches(s.title, term).length +
              // 본문은 줄 단위로 칠하므로 개수도 줄 단위로 셉니다.
              (loggedIn ? s.content.split("\n").reduce((n, line) => n + findMatches(line, term).length, 0) : 0),
            0,
          )
        : 0,
    [sections, term, loggedIn],
  );
  const current = total > 0 ? Math.min(active, total - 1) : 0;

  useEffect(() => {
    if (!term || total === 0) return;
    const el = rootRef.current?.querySelector<HTMLElement>(`mark[data-hit="${current}"]`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [term, current, total]);

  const move = (delta: number) => {
    if (total === 0) return;
    setActive((current + delta + total) % total);
  };

  // 렌더하면서 일치 번호를 매깁니다(제목 → 본문 순서).
  let hit = 0;
  const paint = (text: string): ReactNode => {
    if (!term) return text;
    const matches = findMatches(text, term);
    if (matches.length === 0) return text;
    const parts: ReactNode[] = [];
    let last = 0;
    for (const m of matches) {
      if (m.start > last) parts.push(text.slice(last, m.start));
      const n = hit++;
      parts.push(
        <mark
          key={`${n}`}
          data-hit={n}
          className={cn("rounded-sm px-0.5", n === current ? "bg-orange-400 text-black" : "bg-[#FEE500] text-black")}
        >
          {text.slice(m.start, m.end)}
        </mark>,
      );
      last = m.end;
    }
    if (last < text.length) parts.push(text.slice(last));
    return parts;
  };

  return (
    <div ref={rootRef} className="flex flex-col gap-3">
      <div className="sticky top-[6.25rem] z-30 xl:top-[7.25rem] -mx-1 rounded-xl border border-[#c9a25c]/50 bg-[#1d1611]/95 p-2 shadow-[0_8px_20px_rgb(0_0_0/0.45)] backdrop-blur">
        <div className="flex items-center gap-1.5">
          <label className="relative flex-1">
            <span className="sr-only">TDA 룰에서 찾기</span>
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#9CA3AF]" />
            <input
              type="search"
              value={query}
              placeholder="단어 찾기 (예: 올인, 미스딜, 플로어)"
              className="h-11 w-full rounded-lg border border-white/15 bg-[#141110] pl-9 pr-3 text-base text-white placeholder:text-[#6b6460] focus:border-[#c9a25c] focus:outline-none"
              onChange={(event) => {
                setQuery(event.target.value);
                setActive(0);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  move(event.shiftKey ? -1 : 1);
                }
                if (event.key === "Escape") setQuery("");
              }}
            />
          </label>
          <span className="min-w-14 text-center text-xs font-semibold text-[#c9c0b2]" aria-live="polite">
            {term ? (total > 0 ? `${current + 1} / ${total}` : "0건") : ""}
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
              onClick={() => setQuery("")}
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
              {sections.map((s) => (
                <li key={s.id}>
                  <a
                    href={`#tda-${s.id}`}
                    onClick={() => setTocOpen(false)}
                    className="block rounded-md px-2 py-1.5 text-sm text-[#E5E7EB] hover:bg-white/10"
                  >
                    {s.title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        ) : null}
      </div>

      {!loggedIn ? (
        <p className="ink-panel rounded-xl px-4 py-3 text-sm text-[#c9c0b2]">
          조항 제목만 보입니다. 본문 전체는{" "}
          <Link href={loginHref("/boards/tda")} className="font-bold text-[#e7c98a] underline">
            로그인
          </Link>{" "}
          후 읽을 수 있습니다.
        </p>
      ) : null}

      {sections.length === 0 ? (
        <p className="ink-panel rounded-xl px-4 py-10 text-center text-sm text-[#D1D5DB]">아직 올라온 TDA 룰이 없습니다.</p>
      ) : (
        <article className="ink-panel rounded-2xl px-4 py-2 sm:px-6" aria-label="TDA 룰 전체">
          {sections.map((s, index) => (
            <section
              key={s.id}
              id={`tda-${s.id}`}
              className={cn("scroll-mt-56 py-5", index > 0 && "border-t border-white/10")}
            >
              <div className="flex items-start gap-2">
                <h2 className="flex-1 text-lg font-black leading-snug text-[#e7c98a] sm:text-xl">{paint(s.title)}</h2>
                {canManage ? (
                  <Link
                    href={`/posts/${s.id}/edit`}
                    className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-[#9CA3AF] hover:bg-white/10 hover:text-white"
                  >
                    <PencilIcon className="size-3.5" />
                    수정
                  </Link>
                ) : null}
              </div>
              {loggedIn ? (
                <div className="mt-2 text-[15px] leading-7 text-[#E5E7EB]">
                  {s.content.split("\n").map((line, i) => (
                    <Fragment key={i}>
                      {line.trim() === "" ? (
                        <div className="h-3" aria-hidden />
                      ) : isRuleHeading(line) ? (
                        <p className="mt-2 font-bold text-white">{paint(line)}</p>
                      ) : (
                        <p className="whitespace-pre-wrap break-words">{paint(line)}</p>
                      )}
                    </Fragment>
                  ))}
                </div>
              ) : null}
            </section>
          ))}
        </article>
      )}
    </div>
  );
}
