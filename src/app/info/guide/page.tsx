import type { Metadata } from "next";
import Link from "@/components/ui/link";
import { GUIDE_ARTICLES } from "@/lib/info-pages";
import { GUIDE_CATEGORIES } from "@/lib/guide-links";
import { BOARD_STICKER, BoardTitle } from "@/components/brand/oni";

export const metadata: Metadata = {
  title: "홀덤 딜러 가이드",
  description: "홀덤 딜러 입문부터 셔플 · 피치 · 팟 정산 · TDA 룰 · 급여와 근무까지, 테이블에서 바로 쓰는 실무 가이드.",
  alternates: { canonical: "/info/guide" },
};

export default function GuideHubPage() {
  const bySlug = new Map(GUIDE_ARTICLES.map((row) => [row.slug, row]));
  const placed = new Set(GUIDE_CATEGORIES.flatMap((c) => c.slugs));
  const groups = [
    ...GUIDE_CATEGORIES.map((c) => ({ ...c, rows: c.slugs.map((s) => bySlug.get(s)).filter((r): r is NonNullable<typeof r> => Boolean(r)) })),
    { id: "more", label: "더 보기", hint: "그 밖의 글", slugs: [], rows: GUIDE_ARTICLES.filter((r) => !placed.has(r.slug)) },
  ].filter((g) => g.rows.length > 0);
  return (
    <div className="flex flex-col gap-4">
      <header className="board-intro">
        <BoardTitle sticker={BOARD_STICKER.guide}>홀덤 딜러 가이드</BoardTitle>
        <p className="mt-2">
          입문부터 근무까지 실무 글 {GUIDE_ARTICLES.length}편. 하우스 룰이 있으면 플로어 판정이 우선입니다.
        </p>
      </header>
      {/* 분류 바로가기 */}
      <nav aria-label="가이드 분류" data-guide-tabs className="card-scroller -mx-1 overflow-x-auto px-1">
        <ul className="flex w-max gap-2 sm:w-auto sm:flex-wrap">
          {groups.map((g) => (
            <li key={g.id}>
              <a
                href={`#${g.id}`}
                className="touch-target inline-flex min-h-11 items-center gap-1.5 rounded-full border border-[#c9a25c]/40 bg-[#1d1611] px-4 text-sm font-semibold text-[#f3eadb] hover:border-[#c9a25c]"
              >
                {g.label} <span className="text-xs text-[#c9b48a]">{g.rows.length}</span>
              </a>
            </li>
          ))}
        </ul>
      </nav>
      {groups.map((g) => (
        <section key={g.id} id={g.id} aria-label={g.label} data-guide-group={g.id} className="grid scroll-mt-24 gap-2.5">
          <h2 className="text-lg font-black text-[#f3d9a4]">
            {g.label} <span className="text-sm font-semibold text-[#9CA3AF]">· {g.hint}</span>
          </h2>
          <ol className="grid gap-2.5 sm:grid-cols-2">
            {g.rows.map((row) => (
              <li key={row.slug}>
                <Link
                  href={`/info/guide/${row.slug}`}
                  className="ink-panel touch-target flex h-full min-h-20 flex-col rounded-2xl px-4 py-4 hover:bg-[#241c1e]"
                >
                  <span className="text-sm font-bold text-white">{row.title}</span>
                  <span className="mt-1 text-sm text-[#D1D5DB]">{row.summary}</span>
                </Link>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}
