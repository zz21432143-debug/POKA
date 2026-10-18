import type { Metadata } from "next";
import Link from "@/components/ui/link";
import { HOLDEM_GUIDES, HOLDEM_GUIDE_CATEGORIES } from "@/lib/holdem-guides";
import { BOARD_STICKER, BoardTitle } from "@/components/brand/oni";

export const metadata: Metadata = {
  title: "홀덤 가이드 · 플레이어 전략",
  description: "포지션 · 레인지 · 팟 오즈 · 컨티뉴에이션 벳 · SPR까지, 예시 핸드와 숫자로 정리한 홀덤 플레이어 전략 가이드.",
  alternates: { canonical: "/info/holdem" },
};

/** 홀덤 가이드(플레이어용 전략) 목록 — 딜러 가이드(/info/guide)와 따로 */
export default function HoldemGuideHubPage() {
  const bySlug = new Map(HOLDEM_GUIDES.map((row) => [row.slug, row]));
  const groups = HOLDEM_GUIDE_CATEGORIES.map((c) => ({
    ...c,
    rows: c.slugs.map((s) => bySlug.get(s)).filter((r): r is NonNullable<typeof r> => Boolean(r)),
  })).filter((g) => g.rows.length > 0);
  return (
    <div className="flex flex-col gap-4">
      <header className="board-intro">
        <BoardTitle sticker={BOARD_STICKER.guide}>홀덤 가이드</BoardTitle>
        <p className="mt-2">
          플레이어용 전략 글 {HOLDEM_GUIDES.length}편. 예시 핸드와 숫자로 하나씩 따라 해 보세요. 딜러 실무는{" "}
          <Link href="/info/guide" className="font-bold text-[#e7c98a] underline">
            딜러 가이드
          </Link>
          에 있습니다.
        </p>
      </header>
      {groups.map((g) => (
        <section key={g.id} id={g.id} aria-label={g.label} data-holdem-group={g.id} className="grid scroll-mt-24 gap-2.5">
          <h2 className="text-lg font-black text-[#f3d9a4]">
            {g.label} <span className="text-sm font-semibold text-[#9CA3AF]">· {g.hint}</span>
          </h2>
          <ol className="grid gap-2.5 sm:grid-cols-2">
            {g.rows.map((row) => (
              <li key={row.slug}>
                <Link href={`/info/holdem/${row.slug}`} className="ink-panel touch-target flex h-full min-h-20 flex-col rounded-2xl px-4 py-4 hover:bg-[#241c1e]">
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
